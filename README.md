# MYBI Digital cinematic agency website

## Pages and theme

- `/` preserves the approved camera hero and adds a lens-inspired **Explore services** control.
- `/services/` is a separate production entry with seven expandable service groups, the same live atmosphere and the existing Contact dialog.
- `THEME.md` records the agreed colors, typography, motion, lens-control placement and scope before implementation.
- `src/App.tsx` shares the page shell; `src/ServicesPage.tsx` holds the services content. `services/index.html` and the Vite multi-page configuration make direct navigation and refresh work.
- Browser checks covered desktop and 320–390 px mobile layouts, lens navigation, keyboard expansion, direct page refresh, returning home and the conversation dialog. Contact details remain a clearly labeled prototype.

## Current version: 2D camera and live atmosphere

The current React / TypeScript / Vite homepage uses a reference-derived transparent camera cutout, a clean studio plate, live burgundy SVG ribbons and continuously evolving procedural smoke. The live smoke renderer is a 2D GPU effect; the camera remains an image. The earlier 3D scene remains in `src/Scene.tsx` for future use, but is not imported or downloaded by the active homepage.

Run `npm install` and `npm run dev`. Build with `npm run build`; serve the build with `npm run preview`.

- The header contains only the MYBI Digital logo and Contact button. The selected compact Montserrat Black headline is retained.
- Desktop camera placement follows the reference: image height 64.5% of the viewport, bottom-aligned and centered at 47.7% of viewport width. Mobile scales the image by viewport width.
- `src/HeroCamera.tsx` is the foreground replacement point for the final 3D model. Background and atmosphere are separate layers and can stay intact.
- `src/StudioAtmosphere.tsx` morphs ribbon paths over 16 and 19 seconds. `src/LiveSmokeRenderer.ts` evolves layered, domain-warped shader noise continuously: crosswind, lift and changing eddies remain active while the pointer is idle. The visible Canvas layer is capped at 1000 pixels wide; a moving/deforming procedural Canvas fallback covers devices without a usable shader context. `src/InteractiveSmoke.tsx` drives `src/FluidWake.ts`, a small velocity/dye solver with advection, pressure projection and vorticity confinement. The starting wake is about 12-16 CSS pixels wide, follows pointer velocity, curls and dissipates. Entering or resting the pointer creates no disk. The fluid grid is capped at 240 cells per axis, with a faster frame loop only while the wake is active. Wheel scrolling retains broad dispersal without a local circular brush. Background loops pause on hidden pages. Reduced-motion preferences stop idle drift while preserving user-triggered clearing and fade-back.
- Current desktop and 390 x 844 mobile checks cover composition, image loading, mobile overflow, Contact dialog, Escape key, pointer/wheel smoke flow, shader rendering, advancing idle animation time and browser error logs. Isolated numerical checks verified cursor-scale injection width, finite values, dissipation and reduced-motion settling. Other hardware frame rates have not been benchmarked.

### New image assets

The built-in image generation tool produced `public/assets/camera-reference-cutout.png`; its WebP is used by the page. Studio curtains and smoke are rendered in code by `src/StudioAtmosphere.tsx`, rather than using a background image. The generative camera extraction follows the reference closely, but is not a pixel-identical manual mask. The previous background containing frozen ribbons is retained as a design reference.

Exact prompts, source references, outputs and tool mode are recorded in `scripts/asset-provenance.json`.

## Earlier 3D prototype (archived implementation notes)

These notes describe the preserved prototype, not the active 2D rendering path.


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
- The minimal header contains only the MYBI Digital logo and Contact button. Contact opens a clearly labeled prototype dialog until real contact details are supplied.
- Montserrat Black typography uses the earlier compact size on a single line. The camera and tripod use their earlier scale and lower position, with generous space around the headline.
- The earlier restrained studio lighting and dark materials are restored.

## Motion and performance

The scene renders on demand and continues requesting frames only while its damped rotation is settling. Cursor rotation is capped at about 5.4 degrees horizontally and 2.9 degrees vertically. Reduced-motion preferences disable cursor motion and entrance animation. Pixel ratio is capped at 1.6. Desktop, tablet and mobile use rig scales of 1, 0.86 and 0.58 respectively.

## Validation

Production TypeScript/Vite build; desktop and 390 x 844 mobile browser review; GLB and texture decoder loading; foreground layering; mobile overflow; minimal header; Contact dialog close controls and Escape key behavior. Hardware-specific frame rates have not been benchmarked.
