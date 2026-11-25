import * as THREE from 'three';
import { digitalSceneConfig } from './digitalScene/config';
import { loadCharacter, type CharacterHandle } from './digitalScene/character';
import { loadGlobe, type GlobeHandle } from './digitalScene/globe';
import { createFloor, type FloorHandle } from './digitalScene/floor';
import { createLighting, type LightingHandle } from './digitalScene/lighting';

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

export async function mountDigitalScene(host: HTMLElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw abortError();

  const mobile = matchMedia('(pointer: coarse), (max-width: 767px)').matches;
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
  let character: CharacterHandle | undefined;
  let globe: GlobeHandle | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let frame = 0;
  let disposed = false;
  let lastTime = 0;
  const target = new THREE.Vector3();

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
    character?.update(delta);
    globe?.update(delta);
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
    const narrow = width < 768 || mobile;
    const config = digitalSceneConfig.camera;

    camera.fov = narrow ? config.narrowFov : config.fov;
    const position = narrow ? config.narrowPosition : config.position;
    const viewTarget = narrow ? config.narrowTarget : config.target;
    camera.position.set(position[0], position[1], position[2]);
    target.set(viewTarget[0], viewTarget[1], viewTarget[2]);
    camera.lookAt(target);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const dprCap = narrow ? digitalSceneConfig.performance.mobileDpr : digitalSceneConfig.performance.desktopDpr;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(width, height, false);
    if (!document.hidden && (reducedMotion || !frame)) renderFrame(0);
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
    if (reducedMotion) {
      stopLoop();
      renderFrame(0);
    } else {
      startLoop();
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    resizeObserver?.disconnect();
    signal.removeEventListener('abort', onAbort);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    motionQuery.removeEventListener('change', onMotionChange);

    character?.dispose();
    globe?.dispose();
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
    scene.fog = new THREE.FogExp2(0x040507, 0.028);
    camera = new THREE.PerspectiveCamera(
      digitalSceneConfig.camera.fov,
      1,
      digitalSceneConfig.camera.near,
      digitalSceneConfig.camera.far,
    );
    // Layer 1 carries the atmosphere halo; the reflector camera stays on
    // layer 0 so the glow does not smear into the floor reflection.
    camera.layers.enable(1);

    lighting = createLighting(scene, renderer, mobile);
    floor = createFloor(mobile);
    scene.add(floor.root);

    signal.addEventListener('abort', onAbort, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);

    fit();
    resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);

    const results = await Promise.allSettled([
      loadCharacter(signal),
      loadGlobe(signal),
    ]);
    if (results[0].status === 'rejected') throw results[0].reason;
    if (results[1].status === 'rejected') {
      results[0].value.dispose();
      throw results[1].reason;
    }

    const loadedCharacter = results[0].value;
    const loadedGlobe = results[1].value;
    if (disposed || signal.aborted) {
      loadedCharacter.dispose();
      loadedGlobe.dispose();
      throw abortError();
    }

    character = loadedCharacter;
    globe = loadedGlobe;
    scene.add(character.root, globe.root);
    character.setMotionEnabled(!reducedMotion);
    globe.setMotionEnabled(!reducedMotion);

    fit();
    renderer.shadowMap.needsUpdate = true;
    renderFrame(0);
    startLoop();
  } catch (error) {
    dispose();
    throw error;
  }
}
