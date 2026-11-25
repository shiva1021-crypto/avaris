// Verify the exported GLB with the same GLTFLoader used by three.js in the app.
// This Node check stubs image decoding only; geometry, skinning and animation are parsed normally.

import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// GLTFLoader expects a browser-like global when resolving embedded image blobs.
globalThis.self = globalThis;

const root = process.cwd();
const glbPath = path.join(root, 'public/assets/digital-marketing/character/mybi-idle-character.glb');
const reportPath = path.join(
  root,
  'public/assets/digital-marketing/character/verification-report.json',
);

THREE.ImageLoader.prototype.load = function load(url, onLoad) {
  const image = { width: 1, height: 1, src: String(url) };
  if (onLoad) onLoad(image);
  return image;
};

function readGlbJson(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const chunkLength = view.getUint32(12, true);
  const jsonBytes = new Uint8Array(arrayBuffer, 20, chunkLength);
  return JSON.parse(new TextDecoder().decode(jsonBytes));
}

function poseAt(scene, mixer, clip, time, bones) {
  mixer.setTime(time);
  scene.updateMatrixWorld(true);
  const pose = new Map();
  for (const bone of bones) {
    pose.set(bone.name, bone.matrixWorld.clone());
  }
  return pose;
}

function comparePoses(first, second) {
  let maxPosition = 0;
  let maxRotationDegrees = 0;
  for (const [name, matrix] of first) {
    const other = second.get(name);
    if (!other) continue;

    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);

    const otherPosition = new THREE.Vector3();
    const otherRotation = new THREE.Quaternion();
    const otherScale = new THREE.Vector3();
    other.decompose(otherPosition, otherRotation, otherScale);

    maxPosition = Math.max(maxPosition, position.distanceTo(otherPosition));
    maxRotationDegrees = Math.max(
      maxRotationDegrees,
      THREE.MathUtils.radToDeg(rotation.angleTo(otherRotation)),
    );
  }
  return { maxPosition, maxRotationDegrees };
}

const buffer = fs.readFileSync(glbPath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const gltfJson = readGlbJson(arrayBuffer);

const gltf = await new Promise((resolve, reject) => {
  new GLTFLoader().parse(arrayBuffer, '', resolve, reject);
});

const scene = gltf.scene;
scene.updateMatrixWorld(true);

const bones = [];
const skinnedMeshes = [];
let vertices = 0;
let triangles = 0;

scene.traverse((object) => {
  if (object.isBone) bones.push(object);
  if (!object.isSkinnedMesh) return;

  const geometry = object.geometry;
  const position = geometry.getAttribute('position');
  vertices += position ? position.count : 0;
  triangles += geometry.index ? geometry.index.count / 3 : position ? position.count / 3 : 0;

  skinnedMeshes.push({
    name: object.name || '(unnamed)',
    vertices: position ? position.count : 0,
    bones: object.skeleton ? object.skeleton.bones.length : 0,
    hasSkinIndices: Boolean(geometry.getAttribute('skinIndex')),
    hasSkinWeights: Boolean(geometry.getAttribute('skinWeight')),
  });
});

const clip = gltf.animations[0];
const firstTime = Math.min(...clip.tracks.map((track) => track.times[0]));
const lastTime = Math.max(...clip.tracks.map((track) => track.times[track.times.length - 1]));
const mixer = new THREE.AnimationMixer(scene);
mixer.clipAction(clip).play();
const loopDelta = comparePoses(
  poseAt(scene, mixer, clip, firstTime, bones),
  poseAt(scene, mixer, clip, lastTime, bones),
);

const bounds = new THREE.Box3().setFromObject(scene);
const imageViews = new Map(
  gltfJson.bufferViews.map((view, index) => [index, view.byteLength]),
);
const images = gltfJson.images.map((image, index) => ({
  index,
  name: image.name || `(image ${index})`,
  mimeType: image.mimeType,
  bytes: imageViews.get(image.bufferView) ?? null,
}));

const checks = {
  glbLoaded: true,
  singleAnimationClip: gltf.animations.length === 1,
  originalClipName: clip.name === 'Armature|mixamo.com|Layer0',
  fullFrameRange:
    Math.abs(firstTime - 1 / 30) < 1e-4 && Math.abs(lastTime - 299 / 30) < 1e-4,
  allBonesPresent: bones.length === 65,
  sevenSkinnedMeshes: skinnedMeshes.length === 7,
  skinWeightsPresent: skinnedMeshes.every(
    (mesh) => mesh.hasSkinIndices && mesh.hasSkinWeights && mesh.bones === 65,
  ),
  loopSeamWithinTolerance: loopDelta.maxPosition < 0.01 && loopDelta.maxRotationDegrees < 1,
};

const report = {
  verifiedAt: new Date().toISOString(),
  file: path.relative(root, glbPath).replaceAll('\\', '/'),
  bytes: buffer.byteLength,
  extensionsUsed: gltfJson.extensionsUsed ?? [],
  images,
  scene: {
    bones: bones.length,
    skinnedMeshes,
    vertices,
    triangles,
    bounds: {
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
      height: bounds.max.y - bounds.min.y,
    },
  },
  animation: {
    name: clip.name,
    durationSeconds: clip.duration,
    firstKeyframeSeconds: firstTime,
    lastKeyframeSeconds: lastTime,
    tracks: clip.tracks.length,
    keysPerTrack: clip.tracks[0]?.times.length ?? 0,
    loopDelta,
  },
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      bytes: report.bytes,
      clip: report.animation.name,
      durationSeconds: report.animation.durationSeconds,
      tracks: report.animation.tracks,
      keysPerTrack: report.animation.keysPerTrack,
      loopDelta: report.animation.loopDelta,
      bones: report.scene.bones,
      skinnedMeshes: report.scene.skinnedMeshes.length,
      vertices: report.scene.vertices,
      triangles: report.scene.triangles,
      allChecksPassed: report.allChecksPassed,
      report: path.relative(root, reportPath).replaceAll('\\', '/'),
    },
    null,
    2,
  ),
);

if (!report.allChecksPassed) process.exitCode = 1;
