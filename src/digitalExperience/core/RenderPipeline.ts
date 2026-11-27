import * as THREE from 'three';
import {
  bloomExtractFragmentShader,
  blurFragmentShader,
  compositeFragmentShader,
  fullscreenVertexShader,
} from '../shaders/post';
import type { ReflectiveFloorMaterial } from '../materials/ReflectiveFloorMaterial';

interface PipelineOptions {
  mobile: boolean;
  floorY: number;
  reflectionMaterial: ReflectiveFloorMaterial;
  reflectionExclusions: THREE.Object3D[];
}

function createTarget(depthBuffer = false) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer,
    stencilBuffer: false,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  return target;
}

export class RenderPipeline {
  readonly normalTexture: THREE.Texture;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly mobile: boolean;
  private readonly floorY: number;
  private readonly reflectionMaterial: ReflectiveFloorMaterial;
  private readonly reflectionExclusions: THREE.Object3D[];
  private readonly sceneTarget = createTarget(true);
  private readonly normalTarget = createTarget(true);
  private readonly reflectionRaw = createTarget(true);
  private readonly reflectionBlurA = createTarget();
  private readonly reflectionBlurB = createTarget();
  private readonly bloomRaw = createTarget();
  private readonly bloomBlurA = createTarget();
  private readonly bloomBlurB = createTarget();
  private readonly passScene = new THREE.Scene();
  private readonly passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private readonly normalMaterial = new THREE.MeshNormalMaterial();
  private readonly mirrorCamera = new THREE.PerspectiveCamera();
  private readonly reflectorPosition = new THREE.Vector3();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly reflectorNormal = new THREE.Vector3(0, 1, 0);
  private readonly reflectionView = new THREE.Vector3();
  private readonly reflectionTarget = new THREE.Vector3();
  private readonly reflectionLookAt = new THREE.Vector3();
  private readonly cameraRotation = new THREE.Matrix4();
  private readonly reflectionMatrix = new THREE.Matrix4();
  private readonly reflectionBias = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1,
  );
  private readonly blurMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uInput: { value: null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uDirection: { value: new THREE.Vector2(1, 0) },
    },
    vertexShader: fullscreenVertexShader,
    fragmentShader: blurFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  private readonly bloomMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uInput: { value: null },
      uThreshold: { value: 0.62 },
      uSoftKnee: { value: 0.25 },
    },
    vertexShader: fullscreenVertexShader,
    fragmentShader: bloomExtractFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  private readonly compositeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uScene: { value: null },
      uBloom: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uBloomStrength: { value: 0.92 },
      uVignetteStrength: { value: 0.22 },
      uDistortion: { value: 0.006 },
      uGrain: { value: 0.006 },
    },
    vertexShader: fullscreenVertexShader,
    fragmentShader: compositeFragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  private width = 1;
  private height = 1;
  private reflectionWidth = 1;
  private reflectionHeight = 1;
  private bloomWidth = 1;
  private bloomHeight = 1;

  constructor(renderer: THREE.WebGLRenderer, options: PipelineOptions) {
    this.renderer = renderer;
    this.mobile = options.mobile;
    this.floorY = options.floorY;
    this.reflectionMaterial = options.reflectionMaterial;
    this.reflectionExclusions = options.reflectionExclusions;
    this.normalTexture = this.normalTarget.texture;
    this.passQuad.frustumCulled = false;
    this.passScene.add(this.passQuad);
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.width = Math.max(1, Math.round(width * pixelRatio));
    this.height = Math.max(1, Math.round(height * pixelRatio));
    const reflectionScale = this.mobile ? 0.35 : 0.5;
    const bloomScale = this.mobile ? 0.22 : 0.32;
    this.reflectionWidth = Math.max(1, Math.round(this.width * reflectionScale));
    this.reflectionHeight = Math.max(1, Math.round(this.height * reflectionScale));
    this.bloomWidth = Math.max(1, Math.round(this.width * bloomScale));
    this.bloomHeight = Math.max(1, Math.round(this.height * bloomScale));

    this.sceneTarget.setSize(this.width, this.height);
    this.normalTarget.setSize(this.width, this.height);
    this.reflectionRaw.setSize(this.reflectionWidth, this.reflectionHeight);
    this.reflectionBlurA.setSize(this.reflectionWidth, this.reflectionHeight);
    this.reflectionBlurB.setSize(this.reflectionWidth, this.reflectionHeight);
    this.bloomRaw.setSize(this.bloomWidth, this.bloomHeight);
    this.bloomBlurA.setSize(this.bloomWidth, this.bloomHeight);
    this.bloomBlurB.setSize(this.bloomWidth, this.bloomHeight);
    this.compositeMaterial.uniforms.uResolution.value.set(this.width, this.height);
  }

  private renderPass(material: THREE.Material, target: THREE.WebGLRenderTarget | null) {
    this.passQuad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.passScene, this.passCamera);
  }

  private blur(
    source: THREE.Texture,
    first: THREE.WebGLRenderTarget,
    second: THREE.WebGLRenderTarget,
    width: number,
    height: number,
    radius: number,
  ) {
    this.blurMaterial.uniforms.uTexel.value.set(radius / width, radius / height);
    this.blurMaterial.uniforms.uInput.value = source;
    this.blurMaterial.uniforms.uDirection.value.set(1, 0);
    this.renderPass(this.blurMaterial, first);
    this.blurMaterial.uniforms.uInput.value = first.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0, 1);
    this.renderPass(this.blurMaterial, second);
  }

  private updateMirrorCamera(camera: THREE.PerspectiveCamera) {
    this.reflectorPosition.set(0, this.floorY, 0);
    this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    this.reflectionView
      .subVectors(this.reflectorPosition, this.cameraPosition)
      .reflect(this.reflectorNormal)
      .negate()
      .add(this.reflectorPosition);

    this.cameraRotation.extractRotation(camera.matrixWorld);
    this.reflectionLookAt
      .set(0, 0, -1)
      .applyMatrix4(this.cameraRotation)
      .add(this.cameraPosition);
    this.reflectionTarget
      .subVectors(this.reflectorPosition, this.reflectionLookAt)
      .reflect(this.reflectorNormal)
      .negate()
      .add(this.reflectorPosition);

    this.mirrorCamera.copy(camera, false);
    this.mirrorCamera.position.copy(this.reflectionView);
    this.mirrorCamera.up
      .set(0, 1, 0)
      .applyMatrix4(this.cameraRotation)
      .reflect(this.reflectorNormal);
    this.mirrorCamera.lookAt(this.reflectionTarget);
    this.mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    this.mirrorCamera.updateMatrixWorld(true);
    this.reflectionMatrix
      .copy(this.reflectionBias)
      .multiply(this.mirrorCamera.projectionMatrix)
      .multiply(this.mirrorCamera.matrixWorldInverse);
    this.reflectionMaterial.setReflectionMatrix(this.reflectionMatrix);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, elapsed: number) {
    this.updateMirrorCamera(camera);
    const visibility = this.reflectionExclusions.map(object => object.visible);
    this.reflectionExclusions.forEach(object => { object.visible = false; });

    this.renderer.setRenderTarget(this.reflectionRaw);
    this.renderer.clear();
    this.renderer.render(scene, this.mirrorCamera);
    this.blur(
      this.reflectionRaw.texture,
      this.reflectionBlurA,
      this.reflectionBlurB,
      this.reflectionWidth,
      this.reflectionHeight,
      this.mobile ? 4.2 : 5.8,
    );
    this.reflectionMaterial.setReflection(this.reflectionBlurB.texture);

    const originalOverride = scene.overrideMaterial;
    scene.overrideMaterial = this.normalMaterial;
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    scene.overrideMaterial = originalOverride;
    this.reflectionExclusions.forEach((object, index) => { object.visible = visibility[index]; });

    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);

    this.bloomMaterial.uniforms.uInput.value = this.sceneTarget.texture;
    this.renderPass(this.bloomMaterial, this.bloomRaw);
    this.blur(
      this.bloomRaw.texture,
      this.bloomBlurA,
      this.bloomBlurB,
      this.bloomWidth,
      this.bloomHeight,
      this.mobile ? 2.6 : 3.8,
    );

    this.compositeMaterial.uniforms.uScene.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.uBloom.value = this.bloomBlurB.texture;
    this.compositeMaterial.uniforms.uTime.value = elapsed;
    this.renderPass(this.compositeMaterial, null);
  }

  dispose() {
    this.sceneTarget.dispose();
    this.normalTarget.dispose();
    this.reflectionRaw.dispose();
    this.reflectionBlurA.dispose();
    this.reflectionBlurB.dispose();
    this.bloomRaw.dispose();
    this.bloomBlurA.dispose();
    this.bloomBlurB.dispose();
    this.passQuad.geometry.dispose();
    this.blurMaterial.dispose();
    this.bloomMaterial.dispose();
    this.compositeMaterial.dispose();
    this.normalMaterial.dispose();
    this.passScene.clear();
  }
}
