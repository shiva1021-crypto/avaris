# MYBI Digital — Final Optimization Plan

## Purpose

This file records performance and architecture work that is intentionally deferred until the visual design and interaction of every page is complete.

Do not begin this optimization phase while page concepts, room layouts, assets, camera positions, or transitions are still changing. First finish and approve:

- Home
- Business Marketing
- Shop & Brand Films
- Weddings & Events
- Our Work
- About
- Contact
- Desktop and mobile layouts for every page

## Current baseline

- React state and `history.pushState()` now handle navigation between Home and the main studio routes.
- Studio-room navigation already changes rooms without a document reload.
- The homepage camera begins animating before the intro overlay disappears.
- The lens blackout waits for the destination scene to mount and render before fading.
- An `ArrayBuffer` cache prevents the same binary file from being downloaded repeatedly during one session.
- A smaller homepage camera model is selected for mobile devices.

These improvements are useful, but they are not the final optimization architecture.

## Phase 1 — Remove every remaining internal full reload

- Audit every internal link, including Contact calls-to-action, logo links, footer links, menus and buttons.
- Route all same-origin navigation through the shared React navigation function.
- Preserve normal browser behavior for modified clicks, new tabs, downloads and external URLs.
- Keep one React root alive across all site pages.
- Verify browser Back and Forward navigation for every route.
- Verify that page title, focus position, scroll position and accessibility announcements update correctly.

### Completion test

Navigating between any two MYBI Digital pages must not request a new HTML document or recreate the React root.

## Phase 2 — Keep WebGL canvases and scenes alive

### Short-term architecture

- Mount the homepage camera canvas and studio canvas once at application startup.
- Hide, suspend or reveal each canvas during route transitions instead of unmounting it.
- Pause unnecessary animation loops while a canvas is hidden.
- Do not dispose renderers, scenes, textures or geometry during ordinary internal navigation.
- Dispose resources only during a genuine application shutdown, unrecoverable context loss, or explicit cache eviction.

### Long-term architecture

- Replace the two-renderer arrangement with one global `WebGLRenderer` and one persistent canvas.
- Introduce a scene manager that owns the homepage scene and all studio-room scenes.
- Switch the active scene and camera inside the global render loop.
- Centralize resizing, pixel ratio, visibility, reduced-motion behavior and WebGL context recovery.
- Use renderer state boundaries so post-processing from one scene cannot leak into another.

### Completion test

Repeatedly moving Home → Services → Brand Films → Home must retain the same renderer and canvas, with no `forceContextLoss()` call and no asset reconstruction.

## Phase 3 — Prepare destinations behind transitions

When the homepage lens animation begins:

1. Start importing the destination code immediately.
2. Load required binary assets and textures.
3. Parse the destination GLTF files.
4. Construct the scene and upload textures to the GPU.
5. Run `renderer.compileAsync(scene, camera)` for the destination.
6. Render at least one complete destination frame.
7. Mark the destination as visually ready.
8. Complete the route change while the black lens overlay remains opaque.
9. Fade the overlay only after readiness is confirmed.

Add a timeout and static fallback so a failed asset never traps the visitor behind a permanent black screen.

### Completion test

The first visible destination frame must contain the final lighting, materials, textures and motion. There must be no black material flash, shader compilation hitch, static placeholder or late asset pop-in.

## Phase 4 — Add a parsed in-memory asset manager

Create a central asset manager with promise deduplication and reference tracking. Cache:

- Downloaded `ArrayBuffer` data
- Parsed GLTF templates
- Cloneable scene graphs and skeleton-safe clones
- Textures and image bitmaps
- Materials and shader variants
- Environment maps and PMREM results
- Generated globe geometry, land masks and particle data
- Reusable procedural geometry

Define ownership rules before implementation:

- Shared cached assets must not be disposed by an individual page.
- Page-specific clones may be released when no longer required.
- The asset manager controls final disposal and cache eviction.
- Failed promises must be removed so a later retry can succeed.

### Completion test

Returning to a previously visited page must not download, parse, rebuild or re-upload its unchanged shared assets.

## Phase 5 — Compress assets and preload selectively

### Texture work

- Inventory every PNG, JPG and WebP by dimensions, file size, alpha requirement and visual importance.
- Convert suitable large GPU textures to KTX2/Basis Universal.
- Keep UI images in WebP/AVIF when KTX2 provides no benefit.
- Generate mobile-size variants instead of sending desktop-resolution imagery to small screens.
- Confirm correct color space and alpha handling after conversion.

### Geometry work

- Audit triangle counts, material counts, texture sets, unused nodes and animation tracks.
- Compress suitable GLB geometry with Meshopt or DRACO.
- Prefer Meshopt where fast decoding and progressive delivery are more valuable.
- Produce dedicated mobile models with simplified geometry and smaller textures.
- Remove hidden geometry and merge compatible meshes to reduce draw calls.

### Preloading policy

- After the homepage camera becomes ready, preload the most likely next destination during idle time.
- Begin urgent destination preparation as soon as the lens transition starts.
- Use `navigator.connection` where available to avoid aggressive preloading on slow connections or Data Saver.
- On mobile or constrained connections, preload only the selected destination and its critical assets.
- Cancel or lower the priority of speculative work when the visitor chooses a different route.

### Completion test

Measure cold and warm navigation on desktop and a real mid-range mobile device. Warm navigation must reuse parsed assets; slow connections must not download every room unnecessarily.

## Phase 6 — Rendering and runtime tuning

- Establish desktop and mobile frame-time budgets.
- Cap device pixel ratio independently for each performance tier.
- Reduce reflection, bloom, shadow and particle costs on mobile.
- Suspend hidden render loops and expensive pointer effects.
- Avoid per-frame object allocation and unnecessary shader/material variants.
- Add adaptive quality only if fixed mobile/desktop tiers are insufficient.
- Test WebGL context loss and recovery.
- Respect `prefers-reduced-motion` without leaving scenes visually incomplete.

## Phase 7 — Final verification

Run the following only after all page views are approved:

- TypeScript and production build
- Route and browser-history tests
- No-document-reload verification in browser network tools
- Cold-cache and warm-cache performance profiles
- Desktop, tablet and real mobile testing
- Slow 4G and constrained-device testing
- Memory snapshots after repeated route loops
- WebGL renderer, texture, geometry and program counts
- Lighthouse checks used as supporting evidence, not the only performance measurement
- Accessibility keyboard, focus, reduced-motion and screen-reader checks

## Recommended implementation order

1. Finish and approve every page view.
2. Audit and finish internal client-side navigation.
3. Create persistent canvases and scene lifecycle management.
4. Add transition-time destination preparation and `compileAsync()`.
5. Build the parsed asset manager.
6. Convert and compress final approved assets.
7. Add connection-aware preloading.
8. Tune rendering quality and frame budgets.
9. Profile, test and fix regressions.

## Definition of done

Optimization is complete only when:

- Every internal route changes without a document reload.
- The React root and renderer remain alive during ordinary navigation.
- Destinations are fully rendered before their transition overlay clears.
- Shared assets are not repeatedly downloaded, parsed or uploaded.
- Final assets use appropriate compression and mobile variants.
- The site remains smooth and stable after repeated navigation on desktop and mobile.
- Memory use does not continuously increase during route loops.
- All approved visuals and interactions remain unchanged.
