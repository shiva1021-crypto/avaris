import * as THREE from 'three';

export interface BrandFilmsHandle {
  root: THREE.Group;
  update(delta: number): void;
  setMotionEnabled(enabled: boolean): void;
  dispose(): void;
}

/**
 * Brand Films is intentionally rendered as a layered 2.5D composition in
 * DigitalMarketingPage. Keeping an empty room anchor here preserves the shared
 * 360-degree camera controller without loading a second heavy 3D set.
 */
export async function loadBrandFilmsSet(
  signal: AbortSignal,
  _mobile: boolean,
  _awaitAssets = false,
): Promise<BrandFilmsHandle> {
  if (signal.aborted) throw new DOMException('Brand films scene load aborted', 'AbortError');
  const root = new THREE.Group();
  let disposed = false;

  return {
    root,
    update(_delta) {},
    setMotionEnabled(_enabled) {},
    dispose() {
      if (disposed) return;
      disposed = true;
      root.clear();
    },
  };
}
