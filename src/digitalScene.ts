import * as THREE from 'three';
import gsap from 'gsap';
import { RenderPipeline } from './digitalExperience/core/RenderPipeline';
import {
  createDigitalMarketingRoom,
  type DigitalMarketingRoomHandle,
} from './digitalExperience/rooms/DigitalMarketingRoom';
import { digitalSceneConfig, type StudioRoomId } from './digitalScene/config';

export interface DigitalSceneController {
  setRoom(room: StudioRoomId, immediate?: boolean): void;
}

function abortError() {
  return new DOMException('Digital marketing scene mount aborted', 'AbortError');
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
  canvas.dataset.engine = 'three.js r182 · MYBI multipass';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let room: DigitalMarketingRoomHandle | undefined;
  let pipeline: RenderPipeline | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let cameraTween: gsap.core.Tween | undefined;
  let frame = 0;
  let disposed = false;
  let lastTime = 0;
  let elapsed = 0;
  let narrow = mobile;

  const initialCamera = digitalSceneConfig.rooms[initialRoom];
  const cameraState = {
    yaw: initialCamera.yaw,
    cameraY: initialCamera.cameraY,
    targetY: initialCamera.targetY,
    distance: initialCamera.distance,
    narrowPull: initialCamera.narrowPull,
    fov: initialCamera.fov,
    narrowFov: initialCamera.narrowFov,
  };
  let pointerTargetX = 0;
  let pointerTargetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  const target = new THREE.Vector3();

  function applyCamera() {
    if (disposed || !camera) return;
    const { hub } = digitalSceneConfig;
    const forwardX = Math.sin(cameraState.yaw);
    const forwardZ = -Math.cos(cameraState.yaw);
    const rightX = Math.cos(cameraState.yaw);
    const rightZ = Math.sin(cameraState.yaw);
    const pull = narrow ? cameraState.narrowPull : 0;
    const fov = narrow ? cameraState.narrowFov : cameraState.fov;
    const px = finePointer && !reducedMotion ? pointerX : 0;
    const py = finePointer && !reducedMotion ? pointerY : 0;

    camera.position.set(
      hub[0] + forwardX * pull + rightX * px,
      cameraState.cameraY + py,
      hub[2] + forwardZ * pull + rightZ * px,
    );
    target.set(
      hub[0] + forwardX * cameraState.distance,
      cameraState.targetY + py * 0.25,
      hub[2] + forwardZ * cameraState.distance,
    );
    camera.lookAt(target);
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  }

  function stopLoop() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function startLoop() {
    if (disposed || reducedMotion || document.hidden || frame || !room || !pipeline) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function renderFrame(delta: number) {
    if (disposed || !renderer || !camera || !scene || !room || !pipeline) return;
    if (delta > 0) elapsed += delta;
    if (finePointer && !reducedMotion && delta > 0) {
      const ease = 1 - Math.exp(-delta * 4.2);
      pointerX += (pointerTargetX - pointerX) * ease;
      pointerY += (pointerTargetY - pointerY) * ease;
      applyCamera();
    }
    room.update(delta, elapsed);
    pipeline.render(scene, camera, elapsed);
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
    if (disposed || !renderer || !camera || !pipeline) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    narrow = width < 768 || mobile;
    const dprCap = narrow
      ? digitalSceneConfig.performance.mobileDpr
      : digitalSceneConfig.performance.desktopDpr;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, dprCap);

    camera.aspect = width / height;
    applyCamera();
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    pipeline.resize(width, height, pixelRatio);
    if (!document.hidden && (reducedMotion || !frame)) renderFrame(0);
  }

  function onPointerMove(event: PointerEvent) {
    if (!finePointer || reducedMotion || disposed) return;
    const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    pointerTargetX = nx * 0.19;
    pointerTargetY = -ny * 0.075;
  }

  function onPointerLeave() {
    pointerTargetX = 0;
    pointerTargetY = 0;
  }

  function onVisibilityChange() {
    if (document.hidden) stopLoop();
    else if (reducedMotion) renderFrame(0);
    else startLoop();
  }

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    room?.setMotionEnabled(!reducedMotion);
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
    pipeline?.dispose();
    room?.dispose();
    scene?.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas.remove();
  }

  function onAbort() {
    dispose();
  }

  function setRoom(nextRoom: StudioRoomId, immediate = false) {
    if (disposed) return;
    const destination = digitalSceneConfig.rooms[nextRoom];
    let targetYaw = destination.yaw;
    while (targetYaw - cameraState.yaw > Math.PI) targetYaw -= Math.PI * 2;
    while (targetYaw - cameraState.yaw < -Math.PI) targetYaw += Math.PI * 2;
    cameraTween?.kill();

    if (immediate || reducedMotion) {
      Object.assign(cameraState, destination, { yaw: targetYaw });
      applyCamera();
      renderFrame(0);
      return;
    }

    gsap.ticker.lagSmoothing(1200, 100);
    cameraTween = gsap.to(cameraState, {
      yaw: targetYaw,
      cameraY: destination.cameraY,
      targetY: destination.targetY,
      distance: destination.distance,
      narrowPull: destination.narrowPull,
      fov: destination.fov,
      narrowFov: destination.narrowFov,
      duration: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => {
        applyCamera();
        if (!frame) renderFrame(0);
      },
      onComplete: () => {
        applyCamera();
        if (!frame) renderFrame(0);
      },
    });
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    renderer.setClearColor(0x030407, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    renderer.autoClear = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030407);
    scene.fog = null;
    camera = new THREE.PerspectiveCamera(
      digitalSceneConfig.camera.fov,
      1,
      digitalSceneConfig.camera.near,
      digitalSceneConfig.camera.far,
    );

    room = createDigitalMarketingRoom(mobile);
    scene.add(room.root);
    pipeline = new RenderPipeline(renderer, {
      mobile,
      floorY: digitalSceneConfig.floor.y,
      reflectionMaterial: room.floorMaterial,
      reflectionExclusions: room.reflectionExclusions,
    });

    signal.addEventListener('abort', onAbort, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);
    if (finePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
    }

    applyCamera();
    fit();
    resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);
    room.setMotionEnabled(!reducedMotion);
    renderFrame(0);
    startLoop();
    return { setRoom };
  } catch (error) {
    dispose();
    throw error;
  }
}
