import * as THREE from 'three';
import gsap from 'gsap';
import { digitalSceneConfig, type StudioRoomId } from './digitalScene/config';
import { loadCharacter, type CharacterHandle } from './digitalScene/character';
import { loadGlobe, type GlobeHandle } from './digitalScene/globe';
import { createFloor, type FloorHandle } from './digitalScene/floor';
import { createLighting, type LightingHandle } from './digitalScene/lighting';
import { createAtmosphere, type AtmosphereHandle } from './digitalScene/atmosphere';
import { loadBrandFilmsSet, type BrandFilmsHandle } from './digitalScene/brandFilms';

export interface DigitalSceneController {
  setRoom(room: StudioRoomId, immediate?: boolean): void;
}

function abortError() {
  return new DOMException('Digital marketing scene mount aborted', 'AbortError');
}

function disposeRenderables(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse(node => {
    const renderable = node as THREE.Mesh;
    if (renderable.geometry instanceof THREE.BufferGeometry) geometries.add(renderable.geometry);
    const material = renderable.material;
    if (Array.isArray(material)) {
      for (const item of material) if (item instanceof THREE.Material) materials.add(item);
    } else if (material instanceof THREE.Material) {
      materials.add(material);
    }
  });

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    const uniforms = (material as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
      for (const uniform of Object.values(uniforms) as Array<{ value: unknown }>) {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
      }
    }
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export async function mountDigitalScene(
  host: HTMLElement,
  signal: AbortSignal,
  initialRoom: StudioRoomId = 'marketing',
): Promise<DigitalSceneController> {
  if (signal.aborted) throw abortError();

  const mobile = matchMedia('(pointer: coarse), (max-width: 767px)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'digital-scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let lighting: LightingHandle | undefined;
  let floor: FloorHandle | undefined;
  let atmosphere: AtmosphereHandle | undefined;
  let character: CharacterHandle | undefined;
  let globe: GlobeHandle | undefined;
  let brandFilms: BrandFilmsHandle | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let cameraTween: gsap.core.Tween | undefined;
  let frame = 0;
  let disposed = false;
  let lastTime = 0;
  let narrow = mobile;

  const cameraState = {
    yaw: digitalSceneConfig.rooms[initialRoom].yaw,
    progress: initialRoom === 'brand-films' ? 1 : 0,
  };
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  const target = new THREE.Vector3();

  function applyCamera() {
    if (disposed || !camera) return;
    const { hub, rooms } = digitalSceneConfig;
    const marketing = rooms.marketing;
    const films = rooms['brand-films'];
    const t = THREE.MathUtils.clamp(cameraState.progress, 0, 1);

    const forwardX = Math.sin(cameraState.yaw);
    const forwardZ = -Math.cos(cameraState.yaw);
    const rightX = Math.cos(cameraState.yaw);
    const rightZ = Math.sin(cameraState.yaw);

    const pull = narrow ? THREE.MathUtils.lerp(marketing.narrowPull, films.narrowPull, t) : 0;
    const camY = THREE.MathUtils.lerp(marketing.cameraY, films.cameraY, t);
    const targetY = THREE.MathUtils.lerp(marketing.targetY, films.targetY, t);
    const dist = THREE.MathUtils.lerp(marketing.distance, films.distance, t);
    const fov = narrow
      ? THREE.MathUtils.lerp(marketing.narrowFov, films.narrowFov, t)
      : THREE.MathUtils.lerp(marketing.fov, films.fov, t);

    const px = finePointer && !reducedMotion ? pointerX : 0;
    const py = finePointer && !reducedMotion ? pointerY : 0;

    camera.position.set(
      hub[0] + forwardX * pull + rightX * px,
      camY + py,
      hub[2] + forwardZ * pull + rightZ * px,
    );
    target.set(
      hub[0] + forwardX * dist,
      targetY + py * 0.25,
      hub[2] + forwardZ * dist,
    );
    camera.lookAt(target);
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function stopLoop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function startLoop() {
    if (disposed || reducedMotion || document.hidden || frame || !character || !globe) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function renderFrame(delta: number) {
    if (disposed || !renderer || !camera || !scene) return;
    if (finePointer && !reducedMotion && delta > 0) {
      const ease = 1 - Math.exp(-delta * 4.5);
      pointerX += (pointerTargetX - pointerX) * ease;
      pointerY += (pointerTargetY - pointerY) * ease;
      applyCamera();
    }
    character?.update(delta);
    globe?.update(delta);
    atmosphere?.update(delta);
    brandFilms?.update(delta);
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || reducedMotion || document.hidden) return;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    renderFrame(delta);
    startLoop();
  }

  function fit() {
    if (disposed || !renderer || !camera) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    narrow = width < 768 || mobile;

    camera.aspect = width / height;
    applyCamera();
    camera.updateProjectionMatrix();

    const dprCap = narrow ? digitalSceneConfig.performance.mobileDpr : digitalSceneConfig.performance.desktopDpr;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height, false);
    if (!document.hidden && (reducedMotion || !frame)) renderFrame(0);
  }

  function onPointerMove(event: PointerEvent) {
    if (!finePointer || reducedMotion || disposed) return;
    const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    pointerTargetX = nx * 0.22;
    pointerTargetY = -ny * 0.1;
  }

  function onPointerLeave() {
    pointerTargetX = 0;
    pointerTargetY = 0;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stopLoop();
      return;
    }
    if (reducedMotion) renderFrame(0);
    else startLoop();
  }

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    character?.setMotionEnabled(!reducedMotion);
    globe?.setMotionEnabled(!reducedMotion);
    atmosphere?.setMotionEnabled(!reducedMotion);
    brandFilms?.setMotionEnabled(!reducedMotion);
    if (reducedMotion) {
      cameraTween?.kill();
      pointerX = 0;
      pointerY = 0;
      applyCamera();
      stopLoop();
      renderFrame(0);
    } else {
      startLoop();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cameraTween?.kill();
    stopLoop();
    resizeObserver?.disconnect();
    signal.removeEventListener('abort', onAbort);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    motionQuery.removeEventListener('change', onMotionChange);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);

    character?.dispose();
    globe?.dispose();
    brandFilms?.dispose();
    atmosphere?.dispose();
    floor?.dispose();
    lighting?.dispose();
    if (scene) {
      disposeRenderables(scene);
      scene.clear();
    }

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
    canvas.remove();
  }

  function onAbort() {
    dispose();
  }

  function setRoom(room: StudioRoomId, immediate = false) {
    if (disposed) return;
    const dest = digitalSceneConfig.rooms[room];
    const destProgress = room === 'brand-films' ? 1 : 0;
    cameraTween?.kill();
    if (immediate || reducedMotion) {
      cameraState.yaw = dest.yaw;
      cameraState.progress = destProgress;
      applyCamera();
      renderFrame(0);
      return;
    }
    gsap.ticker.lagSmoothing(1200, 100);
    cameraTween = gsap.to(cameraState, {
      yaw: dest.yaw,
      progress: destProgress,
      duration: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => {
        applyCamera();
        if (!frame) renderFrame(0);
      },
      onComplete: () => {
        applyCamera();
        if (renderer) renderer.shadowMap.needsUpdate = true;
        if (!frame) renderFrame(0);
      },
    });
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040507, 0.026);
    camera = new THREE.PerspectiveCamera(
      digitalSceneConfig.camera.fov,
      1,
      digitalSceneConfig.camera.near,
      digitalSceneConfig.camera.far,
    );
    camera.layers.enable(1);

    lighting = createLighting(scene, renderer, mobile);
    floor = createFloor(mobile);
    atmosphere = createAtmosphere(mobile);
    scene.add(floor.root, atmosphere.root);

    signal.addEventListener('abort', onAbort, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);
    if (finePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
    }

    fit();
    resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);

    const results = await Promise.allSettled([
      loadCharacter(signal),
      loadGlobe(signal),
      loadBrandFilmsSet(signal, mobile, initialRoom === 'brand-films'),
    ]);
    if (results[0].status === 'rejected') throw results[0].reason;
    if (results[1].status === 'rejected') {
      results[0].value.dispose();
      throw results[1].reason;
    }

    const loadedCharacter = results[0].value;
    const loadedGlobe = results[1].value;
    if (results[2].status === 'rejected') {
      console.error('BrandFilms load failed:', results[2].reason);
    }
    const loadedBrandFilms = results[2].status === 'fulfilled' ? results[2].value : undefined;
    if (disposed || signal.aborted) {
      loadedCharacter.dispose();
      loadedGlobe.dispose();
      loadedBrandFilms?.dispose();
      throw abortError();
    }

    character = loadedCharacter;
    globe = loadedGlobe;
    brandFilms = loadedBrandFilms;
    scene.add(character.root, globe.root);
    if (brandFilms) scene.add(brandFilms.root);

    character.setMotionEnabled(!reducedMotion);
    globe.setMotionEnabled(!reducedMotion);
    atmosphere.setMotionEnabled(!reducedMotion);
    brandFilms?.setMotionEnabled(!reducedMotion);

    fit();
    renderer.shadowMap.needsUpdate = true;
    renderFrame(0);
    startLoop();

    return { setRoom };
  } catch (error) {
    dispose();
    throw error;
  }
}
