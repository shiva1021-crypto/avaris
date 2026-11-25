import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import rigUrl from '../models/avaris-camera-tripod.glb?url';
import mobileRigUrl from '../models/avaris-camera-tripod-mobile.glb?url';

// Feathered reflection panels are baked once into the lighting environment.
// Their gradients remain visible on black glass and brushed metal as the rig turns.
function reflectionPanel(room: THREE.Scene, position: THREE.Vector3, width: number, height: number, power: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 24, 16);
  const uv = geometry.getAttribute('uv');
  const colors = [];
  for (let i = 0; i < uv.count; i++) {
    const x = 2 * uv.getX(i) - 1, y = 2 * uv.getY(i) - 1;
    const level = power * Math.max(0, 1 - x ** 4) * Math.max(0, 1 - y ** 2);
    colors.push(level * .88, level * .93, level);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const panel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  panel.position.copy(position);
  panel.lookAt(0,0,0);
  room.add(panel);
}

export async function mountStudioCamera(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const mobile = matchMedia('(pointer: coarse), (max-width: 600px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  // A low, long-lens view reveals the underside of the flag and monitor.
  // The optical axis passes through the mounting shoe, the reference landmark.
  const distance = 2.27;
  const framedHeight = .400;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(framedHeight / (2 * distance)));
  const camera = new THREE.PerspectiveCamera(fov, 1, .05, 5);
  camera.position.set(-.667,-.070,.742).normalize().multiplyScalar(distance);
  camera.lookAt(0,0,0);
  const loader = new GLTFLoader();
  let environment: THREE.WebGLRenderTarget | undefined;
  let resize: ResizeObserver | undefined;
  let frame = 0;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resize?.disconnect();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    scene.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) materials.add(m);
    });
    for (const m of materials) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
      m.dispose();
    }
    for (const t of textures) t.dispose();
    environment?.dispose();
    renderer.dispose();
  }
  try {
    const response = await fetch(mobile ? mobileRigUrl : rigUrl, { signal });
    if (!response.ok) throw new Error('Camera model unavailable');
    const rig = await loader.parseAsync(await response.arrayBuffer(), '');
    scene.add(rig.scene);
    if (signal.aborted) { dispose(); return; }
    signal.addEventListener('abort', dispose, { once: true });
    const head = rig.scene.children.find(node => node.children.some(child => child.name === 'Chassis'));
    if (!head) throw new Error('Camera mount missing');
    rig.scene.traverse(part => {
      if (part instanceof THREE.Mesh) {
        part.castShadow = true;
        part.receiveShadow = true;
      }
    });
    const room = new RoomEnvironment();
    reflectionPanel(room, new THREE.Vector3(-2,3.4,1.3), 6, 2.6, 16);
    reflectionPanel(room, new THREE.Vector3(2.4,1.65,3), 3.8, 1.6, 5);
    reflectionPanel(room, new THREE.Vector3(-3,1,.1), 2.8, 2, 4);
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .035);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = .77;
    function softbox(x: number, y: number, z: number, color: number, intensity: number) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(x,y,z);
      scene.add(light);
      return light;
    }
    const key = softbox(-3,5,2,0xe7edff,3.2);
    key.castShadow = true;
    Object.assign(key.shadow.camera, { left: -.31, right: .31, top: .31, bottom: -.31, near: 5.5, far: 7 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.mapSize.set(1024,1024);
    key.shadow.normalBias = .00035;
    key.shadow.bias = -.00008;
    softbox(2,3,-4,0xafbad0,2.7);
    softbox(-2,1,-3,0xb64a68,.75);
    let push = 0;
    const start = camera.position.clone();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const lens = new THREE.Vector3();
    const holder = canvas.parentElement!;
    const hero = holder.closest('main')!;
    let w = 0, h = 0;
    let referenceWidth = 1, referenceHeight = 1, offsetX = 0, offsetY = 0;
    const draw = () => {
      frame = 0;
      if (!w || !h) return;
      head.localToWorld(lens.set(-100,89,0));
      lens.addScaledVector(forward,.004);
      camera.position.lerpVectors(start,lens,push);
      camera.near = .001;
      camera.setViewOffset(referenceWidth,referenceHeight,
        THREE.MathUtils.lerp(offsetX,(referenceWidth-w)/2,push),
        THREE.MathUtils.lerp(offsetY,(referenceHeight-h)/2,push),w,h);
      renderer.render(scene,camera);
    };
    function fit() {
      const bounds = holder.getBoundingClientRect();
      const viewport = hero.getBoundingClientRect();
      referenceWidth = bounds.width * 1.34;
      referenceHeight = bounds.height;
      const left = viewport.left - bounds.left, top = viewport.top - bounds.top;
      Object.assign(canvas.style, { left: left+'px', top: top+'px', width: viewport.width+'px', height: viewport.height+'px' });
      const narrowLayout = viewport.width <= 600;
      offsetX = left + bounds.width * .17 - (narrowLayout ? .018 : .075) * referenceHeight;
      offsetY = top - .10*referenceHeight;
      w = Math.round(viewport.width);
      h = Math.round(viewport.height);
      if (!w || !h) return;
      // Smooth thin highlights on high-density phones while bounding the
      // number of pixels rendered during rotation and the lens transition.
      const mobilePixelRatio = Math.min(1.25, Math.sqrt(500_000 / (w * h)));
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? mobilePixelRatio : 1.75));
      renderer.setSize(w,h,false);
      cancelAnimationFrame(frame);
      draw();
      const optic = lens.clone().project(camera);
      hero.style.setProperty('--optic-x', (viewport.left + (1 + optic.x) * w / 2) + 'px');
      hero.style.setProperty('--optic-y', (viewport.top + (1 - optic.y) * h / 2) + 'px');
    }
    fit();
    resize = new ResizeObserver(fit);
    resize.observe(hero);
    resize.observe(holder);
    return (degrees: number, lensPush = 0) => {
      push = lensPush;
      const yaw = THREE.MathUtils.degToRad(degrees);
      if (yaw !== head.rotation.y) renderer.shadowMap.needsUpdate = true;
      head.rotation.y = yaw;
      if (!frame) frame = requestAnimationFrame(draw);
    };
  } catch (error) { dispose(); throw error; }
}
