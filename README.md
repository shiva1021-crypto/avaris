# Avaris cinematic homepage

Single-page React / TypeScript / Vite prototype. The scene uses the supplied cinema-camera and tripod GLBs with Three.js, React Three Fiber and Drei. Additional matte box, monitor, handle, rails, cage, fluid head and tripod reinforcement are real procedural 3D geometry.

## Run

```powershell
npm install
npm run dev
```

Build with `npm run build`. Serve the output with `npm run preview`.

## Design and assets

- The reference composition, burgundy accent, cool studio light and three-word headline guide this version.
- `public/assets/studio-background.webp` is the generated clean background used by the page. The original generated PNG is retained alongside it.
- Background produced with the built-in image generation tool using the supplied reference. Prompt: remove the camera, tripod, all branding, navigation and text; seamlessly reconstruct the empty 16:9 studio while preserving the upper-left cool spotlight, dark reflective floor and burgundy wave ribbons in their original positions. No new objects or text.
- The supplied 69.5 MB camera is delivered as a 4.68 MB GLB, with its geometry preserved and embedded textures resized and recompressed. `scripts/prepare-assets.py` rebuilds this delivery asset from the original download path.
- The tripod uses Meshopt and local KTX2/Basis decoders. Its embedded attribution identifies CC0 1.0 / tevy.dev. The supplied camera metadata identifies fab-model-conversion; original asset licensing remains with its source.
- Fonts and all runtime assets are served locally. No account, backend, CMS or contact form is included.
- The minimal header contains only the Avaris logo and Contact button. Contact opens a clearly labeled prototype dialog until real contact details are supplied.
- Oversized Montserrat Black typography sits behind the larger, raised 3D rig. Mobile stacks the three words vertically.
- Studio softboxes, cool fill and edge lights bring out the graphite materials. Beveled accessories, coated lens glass and internal optical rings add detail.

## Motion and performance

The scene renders on demand and continues requesting frames only while its damped rotation is settling. Cursor rotation is capped at about 5.4 degrees horizontally and 2.9 degrees vertically. Reduced-motion preferences disable cursor motion and entrance animation. Pixel ratio ranges from 1.25 to 1.75 for controlled supersampling. Rig size responds to the 3D viewport width, with a maximum scale of 1.36.

## Validation

Production TypeScript/Vite build; desktop and 390 x 844 mobile browser review; GLB and texture decoder loading; foreground layering; mobile overflow; minimal header; Contact dialog close controls and Escape key behavior. Hardware-specific frame rates have not been benchmarked.
