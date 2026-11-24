# Graph Report - .  (2026-11-24)

## Corpus Check
- 29 files · ~263,048 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 385 nodes · 486 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 74% EXTRACTED · 23% INFERRED · 2% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Basis Emscripten Runtime Internals|Basis Emscripten Runtime Internals]]
- [[_COMMUNITY_Interactive Smoke Rendering Stack|Interactive Smoke Rendering Stack]]
- [[_COMMUNITY_Asset Provenance And Prototype History|Asset Provenance And Prototype History]]
- [[_COMMUNITY_Project Config And Route Docs|Project Config And Route Docs]]
- [[_COMMUNITY_App Shell And Services Catalogue|App Shell And Services Catalogue]]
- [[_COMMUNITY_Empty Studio Plate Assets|Empty Studio Plate Assets]]
- [[_COMMUNITY_Services Brief And Motion Guidance|Services Brief And Motion Guidance]]
- [[_COMMUNITY_Basis KTX2 WebGL Bootstrap|Basis KTX2 WebGL Bootstrap]]
- [[_COMMUNITY_Visual Tokens And Typography|Visual Tokens And Typography]]
- [[_COMMUNITY_TypeScript Compiler Settings|TypeScript Compiler Settings]]
- [[_COMMUNITY_Emscripten Exception Handling|Emscripten Exception Handling]]
- [[_COMMUNITY_Camera Cutout PNG Foreground|Camera Cutout PNG Foreground]]
- [[_COMMUNITY_Camera Cutout WebP Delivery|Camera Cutout WebP Delivery]]
- [[_COMMUNITY_Package Scripts And Dependencies|Package Scripts And Dependencies]]
- [[_COMMUNITY_Studio Background PNG Plate|Studio Background PNG Plate]]
- [[_COMMUNITY_Studio Background WebP Delivery|Studio Background WebP Delivery]]
- [[_COMMUNITY_Favicon Brand Mark|Favicon Brand Mark]]
- [[_COMMUNITY_React Root Mounts|React Root Mounts]]
- [[_COMMUNITY_Asset Build Script|Asset Build Script]]
- [[_COMMUNITY_Smoke Shader Compilation|Smoke Shader Compilation]]
- [[_COMMUNITY_Homepage Favicon Link|Homepage Favicon Link]]

## God Nodes (most connected - your core abstractions)
1. `ExceptionInfo` - 14 edges
2. `compilerOptions` - 14 edges
3. `App()` - 11 edges
4. `InteractiveSmoke()` - 11 edges
5. `LiveSmokeRenderer` - 11 edges
6. `Studio Empty WebP Delivery Plate` - 11 edges
7. `FluidWake` - 10 edges
8. `services` - 10 edges
9. `Established visual direction` - 9 edges
10. `Empty Studio Plate Image` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Prototype studio background generation prompt` --semantically_similar_to--> `Studio ribbon-removal prompt`  [AMBIGUOUS] [semantically similar]
  README.md → scripts/asset-provenance.json
- `Earlier 3D prototype (archived)` --conceptually_related_to--> `dependencies`  [AMBIGUOUS]
  README.md → package.json
- `avaris-cinematic-hero package` --conceptually_related_to--> `Avaris cinematic agency website`  [INFERRED]
  package.json → README.md
- `Camera background-extraction prompt` --rationale_for--> `Reference-derived transparent camera cutout`  [INFERRED]
  scripts/asset-provenance.json → README.md
- `Homepage high-priority preload of camera-reference-cutout.webp` --shares_data_with--> `Camera cutout provenance record`  [INFERRED]
  index.html → scripts/asset-provenance.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layered smoke rendering stack** — src_studioatmosphere_studioatmosphere, src_interactivesmoke_interactivesmoke, src_livesmokerenderer_livesmokerenderer, src_fluidwake_fluidwake, src_smoketexture_createsmokesprite [INFERRED 0.95]
- **Reduced-motion coordination across visual layers** — src_app_app, src_studioatmosphere_studioatmosphere, src_interactivesmoke_interactivesmoke, src_fluidwake_step, src_scene_rig [INFERRED 0.85]
- **Composed camera rig** — src_scene_cameramodel, src_scene_accessories, src_scene_tripod, src_scene_rig [INFERRED 0.95]
- **Active 2D rendering pipeline layers** — readme_2d_rendering_path, readme_camera_cutout, readme_clean_studio_plate, readme_live_ribbons, readme_live_smoke [EXTRACTED 1.00]
- **Seven expandable service groups form the editorial services list** — theme_editorial_list, theme_service_websites, theme_service_strategy, theme_service_social, theme_service_video, theme_service_search, theme_service_branding, theme_service_email [EXTRACTED 1.00]
- **Multi-page production build entries** — index_homepage_entry, services_index_entry, vite_config_rollup_inputs, readme_multipage_nav [INFERRED 0.85]
- **** — public_assets_studio_background_cinematic_environment, public_assets_studio_background_cool_spotlight, public_assets_studio_background_reflective_floor [INFERRED 0.85]

## Communities (23 total, 5 thin omitted)

### Community 0 - "Basis Emscripten Runtime Internals"
Cohesion: 0.05
Nodes (22): addOnPostRun(), addOnPreRun(), addRunDependency(), craftInvokerFunction(), createJsInvoker(), createWasm(), destructor(), findWasmBinary() (+14 more)

### Community 1 - "Interactive Smoke Rendering Stack"
Cohesion: 0.06
Nodes (31): Dye clearing mask in fog, FluidWake, FluidWake.injectStroke, FluidWake.sample, FluidWake.step, FluidWake.writeMask, Animated Canvas 2D sprite fallback, InteractiveSmoke() (+23 more)

### Community 2 - "Asset Provenance And Prototype History"
Cohesion: 0.08
Nodes (35): Homepage high-priority preload of camera-reference-cutout.webp, Homepage preload of studio-empty.webp, dependencies, gsap, react, react-dom, @react-three/drei, @react-three/fiber (+27 more)

### Community 3 - "Project Config And Route Docs"
Cohesion: 0.07
Nodes (34): Homepage HTML entry, Homepage meta description, dist build output directory, OpenAI project identifier, Static hosting configuration, avaris-cinematic-hero package, Development dependencies, scripts (+26 more)

### Community 4 - "App Shell And Services Catalogue"
Cohesion: 0.10
Nodes (28): App(), Contact Dialog, isServicesPage, onContact callback (showModal), onReady callback (setLoaded), Pathname-based route split, HeroCamera(), camera-reference-cutout.webp asset (+20 more)

### Community 5 - "Empty Studio Plate Assets"
Cohesion: 0.10
Nodes (25): CSS Studio Background Layer, Base Plate for Live Ribbons and Smoke, Removed Burgundy Wave Ribbons and Red Glow, Absent Camera, Tripod, Branding and Text, Smooth Cool Slate Studio Haze, Near-Black Onyx Studio Environment, Dark Polished Floor, Design Reference Asset Role (+17 more)

### Community 6 - "Services Brief And Motion Guidance"
Cohesion: 0.09
Nodes (23): Current 2D path validation checks, Moving procedural Canvas fallback, Prototype Contact dialog, InteractiveSmoke and FluidWake velocity/dye solver, Continuously evolving procedural smoke (2D GPU effect), LiveSmokeRenderer domain-warped shader noise, Minimal header with logo and Contact button, Reduced-motion and hidden-tab pause behavior (+15 more)

### Community 7 - "Basis KTX2 WebGL Bootstrap"
Cohesion: 0.15
Nodes (19): createWasm WebAssembly bootstrap, Emscripten embind type-registration runtime, findWasmBinary resolves basis_transcoder.wasm, getBinaryPromise WASM byte loader, instantiateArrayBuffer fallback compiler, instantiateAsync streaming compile with fallback, KTX2 / Basis Universal texture transcoding role, locateFile path-resolution hook (+11 more)

### Community 8 - "Visual Tokens And Typography"
Cohesion: 0.12
Nodes (18): Homepage theme-color #0a0a0a, Montserrat font copyright 2024, SIL Open Font License version 1.1, OFL permissions and conditions, Reserved Font Name restriction, Compact Montserrat Black headline, Live burgundy SVG ribbons, Locally served fonts and runtime assets, no backend (+10 more)

### Community 9 - "TypeScript Compiler Settings"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 11 - "Camera Cutout PNG Foreground"
Cohesion: 0.19
Nodes (13): Professional Cinema Camera Rig Subject, Subtle Crimson Lens Reflection, Dark Cinematic Studio Lighting, Fluid Head and Cropped Tripod Legs, Square Matte Box and Lens, Mounted Upper Monitor and Top Handle, Reference-Derived Generative Extraction, Replaceable Hero Foreground Layer (+5 more)

### Community 12 - "Camera Cutout WebP Delivery"
Cohesion: 0.21
Nodes (13): Transparent WebP camera cutout for hero foreground delivery, Professional cinema camera rig subject, Dark cinematic studio lighting on matte black hardware, Fluid head and bottom-cropped tripod legs, High-priority preloaded WebP delivery asset, Homepage hero foreground and future 3D swap point, Lens with subtle crimson reflection, Large square matte box with raised top flap (+5 more)

### Community 13 - "Package Scripts And Dependencies"
Cohesion: 0.17
Nodes (11): devDependencies, @types/react, @types/react-dom, @types/three, typescript, vite, @vitejs/plugin-react, name (+3 more)

### Community 14 - "Studio Background PNG Plate"
Cohesion: 0.36
Nodes (8): Background Layer Design Role, Burgundy Wave Ribbons, Cinematic Studio Environment, Cool Upper-Left Spotlight, Frozen Ribbons Design Reference, Absence of Camera and Branding, Reflective Floor, Generated Studio Plate

### Community 15 - "Studio Background WebP Delivery"
Cohesion: 0.29
Nodes (8): Burgundy Wave Ribbons, Upper-Left Cool Spotlight, Studio Background WebP Delivery Plate, Empty Studio Plate, Cinematic Agency Homepage Background Role, Camera and Branding Removal, PNG Source Counterpart, Dark Reflective Floor

### Community 16 - "Favicon Brand Mark"
Cohesion: 0.47
Nodes (6): Favicon as compact brand mark, Burgundy crimson fill, Possible cinematic motion reading, 64 by 64 scalable canvas, Slanted parallelogram glyph, Avaris brand favicon SVG

## Ambiguous Edges - Review These
- `dependencies` → `Earlier 3D prototype (archived)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Current 2D camera and live atmosphere rendering path` → `Prototype motion and performance settings`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Prototype studio background generation prompt` → `Studio ribbon-removal prompt`  [AMBIGUOUS]
  README.md · relation: semantically_similar_to
- `BASIS factory and module entry point` → `Scene.tsx KTX2Loader consumer (external caller)`  [AMBIGUOUS]
  public/basis/basis_transcoder.js · relation: references
- `locateFile path-resolution hook` → `Scene.tsx KTX2Loader consumer (external caller)`  [AMBIGUOUS]
  public/basis/basis_transcoder.js · relation: references
- `Professional Cinema Camera Rig Subject` → `Subtle Crimson Lens Reflection`  [AMBIGUOUS]
  scripts/asset-provenance.json · relation: conceptually_related_to
- `Professional cinema camera rig subject` → `Three-quarter front-left camera orientation (uncertain)`  [AMBIGUOUS]
  public/assets/camera-reference-cutout.webp · relation: conceptually_related_to
- `Dark Polished Floor` → `Floor Horizon at 84 Percent Height`  [AMBIGUOUS]
  public/assets/studio-empty.png · relation: conceptually_related_to
- `Dark Polished Floor` → `Restrained Silver Floor Reflections`  [AMBIGUOUS]
  public/assets/studio-empty.png · relation: conceptually_related_to
- `Studio Empty WebP Delivery Plate` → `Floor Horizon at 84 Percent Height`  [AMBIGUOUS]
  scripts/asset-provenance.json · relation: conceptually_related_to
- `Slanted parallelogram glyph` → `Possible cinematic motion reading`  [AMBIGUOUS]
  public/favicon.svg · relation: semantically_similar_to

## Knowledge Gaps
- **114 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `dependencies` and `Earlier 3D prototype (archived)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Current 2D camera and live atmosphere rendering path` and `Prototype motion and performance settings`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Prototype studio background generation prompt` and `Studio ribbon-removal prompt`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `BASIS factory and module entry point` and `Scene.tsx KTX2Loader consumer (external caller)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `locateFile path-resolution hook` and `Scene.tsx KTX2Loader consumer (external caller)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Professional Cinema Camera Rig Subject` and `Subtle Crimson Lens Reflection`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Professional cinema camera rig subject` and `Three-quarter front-left camera orientation (uncertain)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._