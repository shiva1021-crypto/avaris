import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3, Color, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Path, Shape, Vector3 } from 'three';

const ASSETS = '/assets/';
const black = '#272c33';
const metal = '#424c58';

function Block({ position, scale, color = black, metalness = .62, roughness = .29, rotation = [0, 0, 0] }: {
  position: [number, number, number]; scale: [number, number, number]; color?: string; metalness?: number; roughness?: number; rotation?: [number, number, number];
}) {
  return <RoundedBox position={position} rotation={rotation} args={scale} radius={Math.min(...scale) * .14} smoothness={2} bevelSegments={2}>
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={1.25} />
  </RoundedBox>;
}

function Rod({ position, radius, length, rotation = [Math.PI / 2, 0, 0], color = metal }: {
  position: [number, number, number]; radius: number; length: number; rotation?: [number, number, number]; color?: string;
}) {
  return <mesh position={position} rotation={rotation}><cylinderGeometry args={[radius, radius, length, 24]} />
    <meshStandardMaterial color={color} metalness={.85} roughness={.24} envMapIntensity={1.3} /></mesh>;
}

function Accessories() {
  const [matte] = useState(() => {
    const shape = new Shape();
    shape.moveTo(-.91, -.71); shape.lineTo(.91, -.71); shape.lineTo(.91, .71); shape.lineTo(-.91, .71); shape.closePath();
    const hole = new Path(); hole.absarc(0, 0, .57, 0, Math.PI * 2, true); shape.holes.push(hole);
    return shape;
  });
  return <group>
    {/* Open matte box; the GLB's real glass and lens remain visible through it. */}
    <Block position={[-.94, 0, 2.36]} scale={[.13, 1.55, .32]} />
    <Block position={[.94, 0, 2.36]} scale={[.13, 1.55, .32]} />
    <Block position={[0, -.75, 2.36]} scale={[1.9, .11, .32]} />
    <Block position={[0, .75, 2.36]} scale={[1.9, .11, .32]} />
    <mesh position={[0, 0, 2.23]}><extrudeGeometry args={[matte, { depth: .065, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2, curveSegments: 48 }]} /><meshStandardMaterial color="#252a31" metalness={.5} roughness={.34} envMapIntensity={1.2} /></mesh>
    <mesh position={[0, 0, 2.27]} scale={[1, 1, .075]}>
      <sphereGeometry args={[.49, 48, 24]} />
      <meshPhysicalMaterial color="#171c29" metalness={.3} roughness={.11} clearcoat={1} clearcoatRoughness={.055} iridescence={.55} iridescenceIOR={1.3} iridescenceThicknessRange={[180, 320]} envMapIntensity={1.4} transparent opacity={.2} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0, 2.29]}><torusGeometry args={[.515, .018, 8, 64]} /><meshStandardMaterial color="#515e6a" metalness={.9} roughness={.2} /></mesh>
    {[.45, .395, .335, .265].map((radius, i) => <mesh key={`optic-${radius}`} position={[0, 0, 2.31 + i * .018]}>
      <torusGeometry args={[radius, .012, 8, 64]} />
      <meshStandardMaterial color={i % 2 ? '#20212a' : '#35404b'} metalness={.88} roughness={.22} envMapIntensity={.65} />
    </mesh>)}
    <mesh position={[.01, .015, 2.37]} scale={[1, 1, .23]}><sphereGeometry args={[.245, 40, 24]} />
      <meshPhysicalMaterial color="#1c0d16" metalness={.55} roughness={.13} clearcoat={1} clearcoatRoughness={.08} envMapIntensity={1.1} />
    </mesh>
    <Block position={[0, .94, 2.58]} scale={[2.05, .045, 1.08]} rotation={[-.25, 0, 0]} />
    {/* Fine metal edging catches the studio softbox. */}
    <Block position={[-1.015, 0, 2.52]} scale={[.018, 1.57, .018]} color="#727a82" />
    <Block position={[1.015, 0, 2.52]} scale={[.018, 1.57, .018]} color="#727a82" />
    <Block position={[0, -.81, 2.52]} scale={[2.04, .018, .018]} color="#727a82" />
    <Block position={[0, 1.07, -.15]} scale={[.16, .5, .22]} />
    <Block position={[0, 1.07, -.98]} scale={[.16, .5, .22]} />
    <Rod position={[0, 1.34, -.5]} radius={.12} length={1.38} color="#15171a" />
    {Array.from({ length: 9 }, (_, i) => <Rod key={i} position={[0, 1.34, -1.02 + i * .13]} radius={.128} length={.035} color="#33373b" />)}
    <Rod position={[0, 1.64, -.58]} radius={.08} length={.5} rotation={[0, 0, 0]} />
    <group position={[0, 2.12, -.58]} rotation={[-.12, .08, 0]}>
      <Block position={[0, 0, 0]} scale={[1.67, 1.03, .13]} color="#444b53" />
      <Block position={[0, 0, .078]} scale={[1.6, .96, .045]} />
      <mesh position={[0, .025, .105]}><planeGeometry args={[1.47, .81]} />
        <meshBasicMaterial color="#1b232d" toneMapped={false} />
      </mesh>
      <Block position={[.87, -.1, 0]} scale={[.055, .43, .09]} color="#25292d" />
    </group>
    <Block position={[0, -.94, .4]} scale={[1.75, .2, 1.9]} />
    <Rod position={[-.66, -1.07, .75]} radius={.065} length={4.1} color="#7a858f" />
    <Rod position={[.66, -1.07, .75]} radius={.065} length={4.1} color="#7a858f" />
    <Block position={[0, -1.25, .05]} scale={[1.12, .22, 1.1]} />
    <Block position={[1.045, .05, -.12]} scale={[.12, 1.5, 1.2]} color="#303842" />
    {Array.from({ length: 8 }, (_, i) => <Block key={'vent'+i} position={[1.11, -.4 + i * .12, -.13]} scale={[.025, .045, .65]} color="#090b0e" />)}
    {[-.58, .68].flatMap(y => [-.57, .34].map(z => <Rod key={`screw-${y}-${z}`} position={[1.12, y, z]} radius={.032} length={.018} rotation={[0, 0, Math.PI / 2]} color="#73808a" />))}
    <Block position={[0, .87, -.1]} scale={[2.05, .075, 1.45]} color="#32383f" />
    <Rod position={[-.88, -.53, 1.3]} radius={.24} length={.24} rotation={[0, 0, Math.PI / 2]} color="#a5abb0" />
    <Rod position={[-1.02, -.53, 1.3]} radius={.14} length={.1} rotation={[0, 0, Math.PI / 2]} color="#202428" />
    <mesh position={[0, 0, 1.68]}><torusGeometry args={[.56, .018, 8, 64]} /><meshStandardMaterial color="#76253b" metalness={.55} roughness={.35} /></mesh>
    {/* Fluid head bridges the supplied camera and tripod assets. */}
    <Rod position={[0, -1.53, .02]} radius={.45} length={.44} rotation={[0, 0, Math.PI / 2]} />
    <Rod position={[-.49, -1.53, .02]} radius={.27} length={.13} rotation={[0, 0, Math.PI / 2]} color="#343a40" />
    <Rod position={[0, -1.86, .02]} radius={.47} length={.22} rotation={[0, 0, 0]} />
    <Rod position={[0, -1.98, .02]} radius={.48} length={.035} rotation={[0, 0, 0]} color="#84233e" />
    {[0, 2.0944, 4.1888].map(angle => <group key={angle} rotation={[0, angle, 0]} position={[0, -2.12, 0]}>
      <Rod position={[0, -.12, .28]} radius={.2} length={.45} rotation={[Math.PI / 2, 0, 0]} />
      <group position={[0, -.14, .32]} rotation={[-.34, 0, 0]}>
        <Rod position={[-.09, -1.4, 0]} radius={.055} length={2.8} rotation={[0, 0, 0]} color="#5e6872" />
        <Rod position={[.09, -1.4, 0]} radius={.055} length={2.8} rotation={[0, 0, 0]} color="#5e6872" />
        <Block position={[0, -1.8, 0]} scale={[.3, .22, .18]} />
      </group>
    </group>)}
  </group>;
}

function CameraModel() {
  const gltf = useLoader(GLTFLoader, ASSETS + 'cinema-camera.glb');
  const [object] = useState(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse(node => {
      if (node.name === 'ground_0') node.visible = false;
      if (node instanceof Mesh) {
        const original = node.material as MeshStandardMaterial;
        const material = new MeshPhysicalMaterial({
          name: original.name,
          map: original.map,
          normalMap: original.normalMap,
          roughnessMap: original.roughnessMap,
          metalnessMap: original.metalnessMap,
          aoMap: original.aoMap,
          color: new Color(2.5, 2.65, 2.85),
          roughness: .72,
          metalness: .78,
          envMapIntensity: 1.45,
          clearcoat: .13,
          clearcoatRoughness: .3,
        });
        material.normalScale.set(.8, .8);
        node.material = material;
      }
    });
    return clone;
  });
  return <primitive object={object} />;
}

function Tripod() {
  const gl = useThree(state => state.gl);
  const gltf = useLoader(GLTFLoader, ASSETS + 'tripod.glb', loader => {
    loader.setMeshoptDecoder(MeshoptDecoder);
    const ktx = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl);
    loader.setKTX2Loader(ktx);
  });
  const [object] = useState(() => {
    const clone = gltf.scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 4.5 / size.y;
    clone.scale.multiplyScalar(scale);
    clone.position.set(-center.x * scale, -2.04 - bounds.max.y * scale, -center.z * scale);
    clone.traverse(node => {
      if (node instanceof Mesh) {
        const material = (node.material as MeshStandardMaterial).clone();
        material.color = new Color('#a5afba');
        material.envMapIntensity = 1.25;
        material.roughness = .65;
        node.material = material;
      }
    });
    return clone;
  });
  return <primitive object={object} />;
}

function Rig({ ready, reducedMotion }: { ready: () => void; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const invalidate = useThree(state => state.invalidate);
  const width = useThree(state => state.size.width);
  const viewportWidth = useThree(state => state.viewport.width);
  useEffect(() => {
    ready();
    if (reducedMotion) { target.current = { x: 0, y: 0 }; invalidate(); return; }
    const move = (event: PointerEvent) => {
      target.current.x = (event.clientX / window.innerWidth - .5) * 2;
      target.current.y = (event.clientY / window.innerHeight - .5) * 2;
      invalidate();
    };
    const reset = () => { target.current = { x: 0, y: 0 }; invalidate(); };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    return () => { window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', reset); window.removeEventListener('blur', reset); };
  }, [invalidate, ready, reducedMotion]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const desiredY = -.66 + target.current.x * .095;
    const desiredX = .055 + target.current.y * .05;
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, desiredY, 4, Math.min(delta, .05));
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, desiredX, 4, Math.min(delta, .05));
    if (Math.abs(group.current.rotation.y - desiredY) + Math.abs(group.current.rotation.x - desiredX) > .00005) invalidate();
  });
  const scale = Math.min(1.36, viewportWidth * .86 / 4.5);
  return <group ref={group} position={[width < 600 ? .22 : .12, width < 600 ? -.35 : -.2, 0]} rotation={[.055, -.66, 0]} scale={scale}>
    <CameraModel /><Accessories /><Tripod />
  </group>;
}

export default function Scene({ ready, reducedMotion }: { ready: () => void; reducedMotion: boolean }) {
  return (
        <Canvas camera={{ position: [0, .1, 13.4], fov: 35, near: .1, far: 60 }} dpr={[1.25, 1.75]} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMappingExposure = 1.15; }}>
          <hemisphereLight args={['#c1d0e1', '#27222a', 1.25]} />
          <directionalLight position={[-4, 5, 8]} intensity={4} color="#edf2f8" />
          <directionalLight position={[5, 3, 4]} intensity={2.2} color="#c0cfdf" />
          <directionalLight position={[3, 4, -4]} intensity={4.2} color="#a3b7cf" />
          <directionalLight position={[-4, -.5, 4]} intensity={.75} color="#b75c78" />
          <Suspense fallback={null}>
            <Environment resolution={256} frames={1}>
              <Lightformer position={[-5, 4, 4]} rotation={[0, Math.PI / 1.5, 0]} scale={[5, 7, 1]} intensity={5} color="#edf2f8" />
              <Lightformer position={[5, 2, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[2, 6, 1]} intensity={4} color="#b7c7dd" />
              <Lightformer position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 4, 1]} intensity={3} />
              <Lightformer position={[-2, 1, 6]} rotation={[0, Math.PI, 0]} scale={[2, 3, 1]} intensity={1.4} color="#9e718a" />
            </Environment>
            <Rig ready={ready} reducedMotion={reducedMotion} />
          </Suspense>
        </Canvas>
  );
}
