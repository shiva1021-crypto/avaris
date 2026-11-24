import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import rigUrl from '../models/avaris-camera-tripod.glb?url';

export async function mountStudioCamera(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const height = .385;
  const camera = new THREE.OrthographicCamera(-height/2, height/2, height/2, -height/2, .01, 4);
  const target = new THREE.Vector3(-.032, 1.450, 0);
  camera.position.copy(target).add(new THREE.Vector3(-.78,.07,.65));
  camera.lookAt(target);
  const transcoder = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(transcoder).setMeshoptDecoder(MeshoptDecoder);
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
    transcoder.dispose();
    renderer.dispose();
  }
  try {
    const response = await fetch(rigUrl, { signal });
    if (!response.ok) throw new Error('Camera model unavailable');
    const rig = await loader.parseAsync(await response.arrayBuffer(), '');
    scene.add(rig.scene);
    if (signal.aborted) { dispose(); return; }
    signal.addEventListener('abort', dispose, { once: true });
    const head = rig.scene.children.find(node => node.children.some(child => child.name === 'Chassis'));
    if (!head) throw new Error('Camera mount missing');
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .035);
    room.dispose();
    pmrem.dispose();
    scene.environment = environment.texture;
    scene.environmentIntensity = .74;
    function softbox(x: number, y: number, z: number, color: number, intensity: number) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(x,y,z);
      scene.add(light);
    }
    softbox(-3,5,2,0xe7edff,2.1);
    softbox(2,3,-4,0xafbad0,2.7);
    softbox(-2,1,-3,0xb64a68,.75);
    function draw() { frame = 0; renderer.render(scene,camera); }
    function fit() {
      const w=canvas.clientWidth, h=canvas.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      renderer.setSize(w,h,false);
      camera.left=-height*w/h/2;
      camera.right=-camera.left;
      camera.updateProjectionMatrix();
      draw();
    }
    fit();
    resize = new ResizeObserver(fit);
    resize.observe(canvas);
    return (degrees: number) => {
      head.rotation.y = THREE.MathUtils.degToRad(degrees);
      if (!frame) frame = requestAnimationFrame(draw);
    };
  } catch (error) { dispose(); throw error; }
}
