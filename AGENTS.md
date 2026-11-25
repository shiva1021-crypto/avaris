# AGENTS.md — MYBI Digital (`avaris`) shared project direction

This file is the single source of truth for Codex, Antigravity and OpenCode when continuing this project.
It records the agreed direction from the user and the inspection findings for **Milestone 1**.
Implementation details are ready; **final approval to begin implementation is still required**. No source
file may be changed until that approval is given.

---

## 0. Non-negotiables (agreed by the user)

1. **Do not create a new project.** Continue this repository only.
2. **Do not redesign or damage the completed homepage.** `/` keeps its approved camera hero, headline,
   chapter navigation, lens transition, intro rope and mobile layout exactly as they are.
3. New immersive work is **additive** — a separate route, not a replacement for the homepage.
4. **No edits to `src/`, HTML entries, `vite.config.ts`, `package.json`, `THEME.md` or `README.md` until
   final approval.** `AGENTS.md` is documentation and is the only file touched in Milestone 1.
5. Approved brand palette — Onyx `#0A0A0A`, Blue Slate `#536878`, Alabaster `#E5E4E2`,
   Burgundy `#7B1D36`, Accent `#9B2946`.
6. Technology constraints: **Three.js + GSAP + GLSL shaders + appropriate post-processing**, retaining
   the existing Vite / React / TypeScript architecture.
7. The globe must be **genuine procedural 3D geometry**, never a flat image.
8. The eight floating screens must be **independent objects in 3D space**.
9. Use the **provided Mixamo character** and **preserve its idle animation**.
10. Required scene: central animated human facing away, large holographic Earth behind, geographic
    particles, rotating burgundy orbital rings, eight photographic screens, dark reflective studio floor,
    atmospheric smoke, subtle particles, cinematic lighting, large `DIGITAL MARKETING` typography,
    minimal MYBI Digital header and Contact control.
11. **Approved concept image:** `C:\Users\ACTIVE\Downloads\Digital Marketing Command Center.png`
    (1672×941) — confirmed by the user. Copy it into `design-archive/` as a reference; do not render it
    as a texture (see §5).

---

## 1. Current stack and repository conventions

| Area | Current state |
|---|---|
| Package | `avaris-cinematic-hero` v1, private, ESM |
| Scripts | `dev` = `vite --host 127.0.0.1`, `build` = `tsc -b && vite build`, `preview` = `vite preview --host 127.0.0.1` |
| Core deps | `react@^19`, `react-dom@^19`, `three@0.182.0`, `@react-three/fiber@^9`, `@react-three/drei@^10`, `gsap@^3.13`, `pullcord@^0.1.0` |
| Dev deps | `@vitejs/plugin-react@^5`, `typescript@^5.9`, `vite@^7`, `@types/*` |
| TypeScript | Strict, `noUnusedLocals`, `noUnusedParameters`, `jsx: react-jsx`, `noEmit`, `include: ["src"]` |
| Routing | **No router library.** `src/App.tsx` reads `window.location.pathname` and finds a page in `src/pages.ts`. Multi-page Vite build with one `index.html` per route. |
| Fonts | Local TTFs in `public/assets/fonts/`: Montserrat Black (900), DM Sans (400/500/600/700 + italic), Host Grotesk (variable 300–800). |
| CSS | `src/style.css` (shell/home) and `src/services.css` (inner pages), imported once in `src/main.tsx`. |
| Branding | Directory/repo is `avaris`; the site brand is **MYBI Digital** in all copy and metadata. |

### Route entries (current)
`index.html`, `services/index.html`, `brand-films/index.html`, `weddings-events/index.html`,
`work/index.html`, `about/index.html`, `contact/index.html`. All use the same `src/main.tsx`.

---

## 2. Rendering architecture as inspected (commit `cad94a5`)

### 2.1 App shell — `src/App.tsx`
- `currentPage = pages.find(path === pathname with trailing slash)`.
- `isServicesPage = Boolean(currentPage)` — slightly misleading name; it is true for **all** inner pages.
- If true: generic `.services-opening.page-copy` with title/description/details from `pages.ts`.
- If false: homepage branch — `.studio-background`, duplicated `.headline` ("MYBI DIGITAL"),
  `StudioAtmosphere`, `.camera-stage` with `HeroCamera`, `.chapter-nav`, loading label.
- Shared header (`.site-header`): brand mark + optional text, desktop nav (`pages.slice(0, -1)`),
  `.header-contact` → `/contact/`, and a `<dialog>` menu via `.site-menu-toggle`.
- GSAP entrance animations run only on fine-pointer desktop without reduced motion.
- `sessionStorage` keys: `avaris-lens-transition`, `mybi-studio-light-v3`.
- Custom window event: `avaris-transition` with `detail: boolean` suspends atmosphere during lens transitions.

### 2.2 Homepage camera — `src/HeroCamera.tsx` + `src/studioCamera.ts`
- `HeroCamera` dynamically imports `./studioCamera` — Three.js stays out of the initial bundle.
- `mountStudioCamera(canvas, signal)` is an **imperative Three.js renderer**:
  `WebGLRenderer({ alpha: true, antialias: true })`, ACESFilmic tone mapping, soft PCF shadows on desktop,
  `RoomEnvironment` + PMREM with three feathered reflection panels, `GLTFLoader` for
  `models/avaris-camera-tripod.glb` / `-mobile.glb`, geometry merging on mobile, on-demand rendering via
  `requestAnimationFrame` only while damped rotation changes.
- `ResizeObserver` refits a `setViewOffset` camera; pixel ratio capped at 1.75 desktop, ~1.5 mobile.
- GSAP in `HeroCamera` drives idle pan, chapter rotation and the lens push/flash/blackout transition.
- **Rule to preserve:** this module and its CSS hooks are finished work; do not import or alter them for
  the new page.

### 2.3 Dormant 3D prototype — `src/Scene.tsx`
- React Three Fiber + Drei scene with `Canvas`, `Environment`, `Lightformer`, `useLoader`, `useFrame`,
  `GLTFLoader`, `KTX2Loader`, `MeshoptDecoder`; procedural camera accessories; `frameloop="demand"`.
- **Not imported anywhere.** Keep it archived; do not activate or rewrite it.

### 2.4 Atmosphere
- `src/StudioAtmosphere.tsx` — SVG ribbon paths morphing over 16 s via SMIL `<animate>`; pauses on
  hidden tab, reduced motion, and `avaris-transition`.
- `src/InteractiveSmoke.tsx` — 2D `<canvas>` compositing; on fine pointers uses
  `src/LiveSmokeRenderer.ts` (WebGL fragment shader, domain-warped FBM, crosswind/lift, pointer swirl);
  otherwise uses `src/SmokeTexture.ts` cached sprite fallback. Pointer/wheel fluid wake, hidden-tab pause,
  reduced-motion handling, DPR caps (1000 px wide desktop, ~340 px mobile).
- **Stale documentation:** `README.md` and `graphify-out/` still mention `src/FluidWake.ts`; that file is
  **absent from current `src/`** and is not imported. Do not rely on those notes. `graphify-out/` is stale.

### 2.5 Current asset sizes / performance baseline
- `models/avaris-camera-tripod.glb` 7.11 MB, `models/avaris-camera-tripod-mobile.glb` 4.77 MB,
  `models/avaris-cinema.glb` 5.94 MB, `public/assets/cinema-camera.glb` 4.68 MB,
  `public/assets/tripod.glb` 175 KB.
- The homepage dynamically loads one camera GLB only; the new scene must not pull these into its bundle.

---

## 3. New page — agreed architecture

### 3.1 Route and shell
- New path: **`/digital-marketing/`** (confirmed) with `digital-marketing/index.html` mirroring the
  existing HTML entries (title, description, favicon, `#root`, `/src/main.tsx`).
- Add that input to `vite.config.ts` `rollupOptions.input`.
- Extend `src/App.tsx` with a branch **before** the `currentPage` logic that renders a new
  `DigitalMarketingPage` only for that pathname. Do **not** add it to `src/pages.ts` — that array feeds
  the homepage desktop nav, chapter nav and menu, and changing it would alter the finished homepage.
- **Discoverability: direct URL only.** No homepage link, desktop-nav entry or menu link is added in this
  milestone.

### 3.2 Component boundaries
```
src/DigitalMarketingPage.tsx      React host: DOM typography, canvas host, loading/error state,
                                  reduced-motion + visibility handling, reuse of shared header/dialog.
src/digitalScene.ts               Imperative Three.js renderer (mirrors studioCamera.ts pattern),
                                  dynamically imported so Three.js never enters the initial bundle.
src/digitalScene/                 Optional split modules once the scene grows:
  globe.ts                        Icosahedron geometry + holographic GLSL shader + land mask sampling.
  character.ts                    GLB load, AnimationMixer, back-facing placement.
  screens.ts                      Eight independent 3D planes + frames + per-object float.
  floor.ts                        Reflective floor material / planar reflector.
  atmosphere.ts                   In-scene smoke + particle fields.
  shaders.ts                      Shared GLSL chunks and post-processing pass.
digital-marketing/index.html      New Vite multi-page entry.
```
DOM typography, header and Contact stay in HTML/CSS for accessibility and SEO. The canvas is decorative
with `role="img"` and a descriptive label; the eight screens are decorative in the DOM layer.

### 3.3 Scene graph and rendering pipeline
- `WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })`, ACESFilmic tone mapping,
  sRGB output, PCFSoft shadows on desktop only, DPR cap 1.6 desktop / 1.25 mobile.
- `PerspectiveCamera` ~35–40° at roughly `(0, 1.6, 9)` looking at `(0, 1.35, 0)`; GSAP parallax capped to a
  few degrees, disabled for reduced motion.
- `RoomEnvironment` + PMREM + cool/burgundy reflection panels, reusing the `studioCamera.ts` technique.
- **Floor (confirmed):** procedural dark surface at `y = 0` using `Reflector` from
  `three/examples/jsm/objects/Reflector.js` at low resolution on desktop with a roughness/gradient overlay;
  mobile falls back to an env-map `MeshStandardMaterial`. No bitmap floor required.
- **Character:** converted GLB from the Mixamo FBX, rotated ~180° to face away, standing on the floor,
  `AnimationMixer` looping the provided `Breathing Idle` clip. No new idle motion invented.
- **Globe (confirmed):** `IcosahedronGeometry` (detail ~5) with a custom `ShaderMaterial` — vertex
  displacement from 3D noise, fragment fresnel + lat/long grid + **generated coastline land mask**,
  additive/transparent, `depthWrite: false`. Slow independent rotation. Never a sphere with a photo on it.
- **Geographic particles:** `THREE.Points` sampled on the sphere where the land mask is land, with size
  attenuation and slow drift; separate sparse ambient particle field.
- **Rings:** 2–3 tilted `TorusGeometry` meshes in Burgundy/Accent with emissive shader or bloom-friendly
  basic material; GSAP-driven continuous rotation.
- **Eight screens (confirmed structure):** eight separate `THREE.Group`s, each holding a slightly bevelled
  plane with a texture plus a dark frame; individual positions/orbit radii/floating offsets. Stand-in
  textures will be taken from existing project imagery (camera renders, studio plates, logos) and swapped
  for the real photos when supplied. Stand-ins load lazily and are WebP/DPR-capped.
- **Lighting:** cool Blue Slate key from upper left, Alabaster rim, Burgundy back/side accent, low fill;
  restrained and cinematic, consistent with `THEME.md`.
- **Post-processing:** `EffectComposer` → `RenderPass` → `UnrealBloomPass` (restrained) → custom
  vignette/grain/chromatic-aberration `ShaderPass` → `OutputPass`. All are already present in
  `three/examples/jsm/postprocessing/`; **no new dependency required**. Bloom and extra passes disabled
  on mobile and reduced motion.
- **Atmosphere:** in-scene smoke/particles preferred on this route to avoid a second WebGL context from
  `InteractiveSmoke`. If the existing 2D smoke is reused, explicitly budget two contexts and cap both.

### 3.4 Motion, lifecycle and accessibility
- GSAP entrance timeline: typography reveal → globe materialise → rings spin up → screens settle →
  character idle continues. Idle loops afterwards.
- `prefers-reduced-motion`: render one static composed frame, no idle loops, no parallax, no bloom flicker.
- `document.hidden` pauses rendering; `ResizeObserver` refits camera/composer; `AbortController` plus full
  `dispose()` of geometries, materials, textures, render targets and renderer on unmount — same discipline
  as `studioCamera.ts`.
- Existing keyboard/focus styles and Contact `<dialog>` are reused unchanged. No invented contact details,
  statistics, clients or awards.

### 3.5 Delivery phases (each independently reviewable)
- **A — Assets:** copy approved concept image to `design-archive/`; generate coastline land mask; convert
  FBX → optimised GLB with idle animation; prepare stand-in screen textures from existing imagery. No UI changes.
- **B — Shell:** route entry, Vite input, `App.tsx` branch, DOM typography/header/Contact, static fallback.
- **C — Core 3D:** renderer, character + idle, globe, floor, rings, lighting.
- **D — Detail:** eight screens, geographic particles, smoke, post-processing.
- **E — Polish:** GSAP choreography, reduced-motion, hidden-tab pause, mobile/performance pass, validation.

---

## 4. Asset inventory (inspected)

### 4.1 Present in repository
| Asset | Path | Status / use |
|---|---|---|
| Mixamo character + idle | `Breathing Idle.fbx` (repo root, **untracked**, 54.8 MB) | Full skinned character + animation. See §4.3. |
| Camera rig GLBs | `models/avaris-camera-tripod*.glb`, `models/avaris-cinema.glb`, `public/assets/*.glb` | Homepage/archive only; source of stand-in screen imagery. Do not reuse as scene geometry. |
| Studio plates | `public/assets/studio-background.{png,webp}`, `studio-empty.{png,webp}` | Flat 1672×941 backgrounds; stand-in screen imagery and reference, not the new 3D floor. |
| Logos | `public/mybi-logo.png`, `mybi-titanium.png`, `mybi-infinity.svg`, `favicon.svg` | Reuse header assets and stand-in screen imagery. |
| Fonts | `public/assets/fonts/*.ttf` | Reuse; no webfont fetch. |
| Decoders | `public/basis/*` | Available if KTX2 textures are adopted. |
| Design archive | `design-archive/camera-reference-cutout.{png,webp}` | Archived camera cutouts; stand-in screen imagery. |
| Docs | `README.md`, `THEME.md`, `scripts/asset-provenance.json` | Useful history; README/graphify partially stale. |

### 4.2 Present outside the repository (user attachments, in `C:\Users\ACTIVE\Downloads`)
| File | Size | Notes |
|---|---|---|
| `Digital Marketing Command Center.png` | 1.76 MB, 1672×941 | **Confirmed** approved primary concept image. Copy into `design-archive/` as reference. |
| `MYBI Digital_ Luxury Web Experiences.png` | 1.80 MB, 1672×941 | Alternate/cooler concept; not used. |
| `grab3d-lowpoly-character.png` | 201 KB, 2048×1377 RGBA | Treated as unrelated reference; Mixamo FBX is the character source. |
| `Breathing Idle.fbx` | 54.8 MB | Same file now at repo root. |

### 4.3 Mixamo FBX inspection result
- FBX 7.7, imported with Blender 5.3 (`bpy` available at
  `C:\Users\ACTIVE\AppData\Local\Temp\avaris-model-env\Scripts\python.exe`).
- Objects: `Armature` (65 `mixamorig9:*` bones, scale 0.01) and seven skinned meshes
  (`Ch31_Body`, `Ch31_Collar`, `Ch31_Eyelashes`, `Ch31_Hair`, `Ch31_Pants`, `Ch31_Shoes`, `Ch31_Sweater`),
  ~31k vertices total.
- Animation action `Armature|mixamo.com|Layer0`, frames 1–299 at 30 fps (~10 s) — this is the idle clip to
  preserve. Scene frame range 1–250; export the full action range.
- Character bounds ≈ 1.78 m tall, feet at y≈0.
- Seven **packed** textures: four 4096² and three 2048² RGBA — the reason for the 54.8 MB size. Must be
  downscaled (target 1024²/2048²) and recompressed before web delivery.
- Required conversion step: Blender import → clean/unpack → resize textures → export GLB with the animation
  clip (use `bpy.ops.export_scene.gltf(export_format='GLB', export_animations=True)`), then verify with
  `GLTFLoader` that the clip name and loop are intact.

### 4.4 Missing / not found
- **Eight final photographs** — none supplied. Stand-ins from existing imagery are approved; replace with
  real photos when provided.
- **Approved concept image inside the repo** — confirmed file is outside the repo; copy it into
  `design-archive/` as reference only (do not render it as a texture).
- **Earth land/coastline data** — none present. Confirmed approach: generate a 1024×512 land mask once from
  public-domain coastline data and commit it for the shader and geographic particles.
- **Web-ready character GLB** — must be produced from the FBX.
- **Dedicated reflective-floor asset** — none; procedural/shader solution required.

---

## 5. Reference analysis

- `https://steven.com/creator-tech` was fetched. It is a Webflow site using large section typography
  ("Creator Tech", "Less Noise, Better Work"), a `SKETCH MODE` label, dividing rules, Rive canvases and
  editorial case-study blocks. Take **spatial composition and animation quality** as inspiration —
  layered depth, centred subject, restrained typography, continuous subtle motion — but implement with
  Three.js/GSAP/GLSL as the user requires. Do not copy its Rive stack or content.
- Concept image **confirmed**: `Digital Marketing Command Center.png`. Numerical comparison supported the
  choice (~15% pixels near Burgundy vs ~3.7% in the cooler alternate). It cannot be rendered in this
  session; rely on the user's approval for exact composition.

---

## 6. Conflicts and risks with the existing homepage

1. **`src/pages.ts` is homepage navigation data.** Adding the new route there changes desktop nav, chapter
   nav and menu. Avoid; branch in `App.tsx` instead.
2. **`currentPage` is undefined for unknown paths**, so a new HTML entry without an `App.tsx` branch would
   silently render the homepage at that URL. The branch is mandatory.
3. **`.headline` CSS is homepage-specific** (duplicated spans, 12.8vw, metallic gradient mask). Use a new
   class for `DIGITAL MARKETING`; never override `.headline`.
4. **`.studio-background` preload** exists in every HTML entry. The new page should not preload an image it
   does not render; decide per entry.
5. **Two WebGL contexts** — `InteractiveSmoke`/`LiveSmokeRenderer` plus the new scene. Prefer in-scene smoke
   on the new route; if both are mounted, cap both and pause on hidden tabs.
6. **Bundle weight** — homepage must keep its dynamic import boundary. New scene code and assets load only on
   the new route. Character textures are the largest risk; downscale before adding to `public/`.
7. **`Scene.tsx` is dormant** — tempting but stale; do not activate it as a shortcut.
8. **Stale docs** — `README.md` and `graphify-out/` mention removed `FluidWake.ts`; treat source as truth.
9. **Global reduced-motion CSS** disables CSS animation only; GSAP/Three.js loops must be disabled in JS too.
10. **Shared dialog/menu state** lives in `App.tsx`; reuse it rather than adding a second dialog.

---

## 7. Decisions resolved by the user

1. **Concept image:** `Digital Marketing Command Center.png` — confirmed.
2. **Screen imagery:** reuse existing project imagery as stand-ins; swap in real photographs later.
3. **Route:** `/digital-marketing/`, direct URL only — no homepage or menu links.
4. **Globe:** accurate coastlines from a generated land mask.
5. **Floor:** low-res planar reflection on desktop, shader fallback on mobile.

Assumptions (revisit if the user objects):
- The 54.8 MB FBX stays untracked in the workspace; only the optimised GLB is added to the repo, with a
  provenance note in `scripts/asset-provenance.json`.
- `grab3d-lowpoly-character.png` is an unrelated reference; the Mixamo FBX remains the character source.

---

## 8. Tooling notes for future agents

- Use `npm run dev`, `npm run build`, `npm run preview` from `D:\Digital Marketing web\avaris`.
- Blender/Python for FBX conversion:
  `C:\Users\ACTIVE\AppData\Local\Temp\avaris-model-env\Scripts\python.exe` (bpy 5.3, Pillow 13, numpy).
- Prefer imperative Three.js (like `src/studioCamera.ts`) for the new scene; keep GSAP for choreography.
- Post-processing modules already available in `node_modules/three/examples/jsm/postprocessing/`.
- Record any newly generated image assets in `scripts/asset-provenance.json` (existing convention).
- After every implementation phase, run `npm run build` and check desktop + 390×844 mobile, keyboard focus,
  Contact dialog, reduced-motion, hidden-tab pause, horizontal overflow and browser error logs.

---

## 9. Status

- **Milestone 1: inspection complete; decisions recorded.**
- **Phase A: complete.** Assets are prepared, validated and recorded. No source files were modified;
  no route, navigation, HTML entry, Vite config, homepage animation or CSS was changed.
- **Phase B: complete.** The isolated `/digital-marketing/` route and static shell are in place.
  The original homepage remains visually and behaviourally unchanged; no navigation or menu link was added.
- **Phase C: complete.** The core real-time Three.js environment is implemented behind a dynamic import.
  The homepage, navigation, camera, global styling and existing atmosphere modules remain untouched.
- **Phase C visual correction: complete.** The rejected first render was corrected in place against the
  approved concept image. Browser verification is recorded below. Phase D is still awaiting approval.
- The original `Breathing Idle.fbx` remains untracked and unmodified. The optimised GLB is
  `public/assets/digital-marketing/character/mybi-idle-character.glb` (3.72 MB).
- Do not proceed to Phase D until the user explicitly approves it.

### Phase A deliverables

- `public/assets/digital-marketing/asset-manifest.json` — names, dimensions, sizes, sources and licensing.
- `public/assets/digital-marketing/character/` — optimised GLB, conversion report and GLTFLoader verification report.
- `public/assets/digital-marketing/globe/earth-land-mask-1024x512.png` — Natural Earth public-domain land mask.
- `public/assets/digital-marketing/screens/` — eight replaceable WebP stand-in screen textures and manifest.
- `design-archive/Digital Marketing Command Center.png` — approved visual reference only, not a texture.
- `design-archive/digital-marketing-phase-a-previews.png` — combined visual preview.
- `scripts/convert_character.py`, `scripts/verify_character_glb.mjs`, `scripts/generate_land_mask.py`,
  `scripts/prepare_screen_textures.py` — reproducible asset preparation scripts.

### Phase A verification summary

- FBX 54,754,288 bytes → GLB 3,723,152 bytes (93.2% smaller).
- Animation `Armature|mixamo.com|Layer0`, frames 1–299 at 30 fps, 9.9667 s, 195 tracks, 299 keys per track.
- GLTFLoader verification passed: 65 bones, 7 skinned meshes, skin weights intact, loop seam
  `0.0000` units / `0.0622°`; GLB 33,097 vertices / 50,266 triangles.
- Land mask: 1024×512, land 255 / ocean 0, 29.26% land, Natural Earth 1:110m public domain.
- Eight landscape WebP stand-ins created with source aspect ratios preserved; no burgundy tint,
  frames, glow or lighting baked into the textures.
- Mixamo terms are only partially verified because Adobe Help pages returned 403/404. Use the model
  only inside the finished site, do not publish the FBX or a standalone GLB, and recheck current terms
  before public deployment.

### Phase B deliverables

- `digital-marketing/index.html` — dedicated Vite multi-page entry with route-specific metadata.
- `vite.config.ts` — registers the `digitalMarketing` build input.
- `src/App.tsx` — isolated branch before the homepage/services logic; `DigitalMarketingPage` is lazy-loaded.
- `src/DigitalMarketingPage.tsx` — header, Contact link, canvas host, typography, status and static fallback layers
  (the Phase B scroll cue was removed during the Phase C visual correction).
- `src/digital-marketing.css` — scoped cinematic styling, responsive layout and reduced-motion handling.

### Phase B verification summary

- `npm run build` passed. Output includes `dist/digital-marketing/index.html` and a separate
  `DigitalMarketingPage` JS/CSS chunk; the homepage keeps its own chunks and HTML entry.
- Production preview returned HTTP 200 for `/`, `/digital-marketing/` and `/digital-marketing`.
- Vite dev server returned HTTP 200 for `/`, `/digital-marketing/` and `/digital-marketing`.
- `git diff` confirms no changes to `index.html`, `src/style.css`, `src/pages.ts`, `src/main.tsx`,
  `src/HeroCamera.tsx`, `src/StudioAtmosphere.tsx`, `src/InteractiveSmoke.tsx` or `src/Scene.tsx`.
- No browser or headless browser is installed, so pixel screenshots and interactive keyboard/reduced-motion
  inspection remain pending; static markup and CSS were reviewed instead.
- The 3D renderer, globe, character, screens, floor, shaders, smoke, GSAP choreography and homepage
  transition are intentionally not implemented in Phase B.

### Phase C deliverables

- `src/digitalScene.ts` — dynamically imported imperative renderer, ACES/sRGB setup, responsive
  camera framing, `ResizeObserver`, hidden-tab pause, reduced-motion static frame, WebGL failure path,
  abort handling and full disposal.
- `src/digitalScene/config.ts` — independently adjustable camera, globe, ring, character, floor,
  lighting and DPR parameters.
- `src/digitalScene/shaders.ts` — holographic globe, fine grid/fresnel, restrained orbital-ring
  signals, floor fade/grain, contact shadow and low-intensity reflector shaders.
- `src/digitalScene/character.ts` — GLB fetch/parse, original `Armature|mixamo.com|Layer0` clip,
  `AnimationMixer`, 180° yaw, floor alignment, matte material tuning, isolated shoe material and
  transparent hair shadow handling.
- `src/digitalScene/globe.ts` — procedural icosahedron Earth, equirectangular land-mask sampling,
  warm holographic surface, 950 geographic particles, depth shell and three burgundy rings.
- `src/digitalScene/floor.ts` — unlit near-black floor with a radial distance fade, 512² desktop planar
  reflector concentrated on the stage, two warm stage rings and character contact shadow.
- `src/digitalScene/lighting.ts` — PMREM room environment with cool/alabaster/burgundy reflection panels,
  cool key, alabaster rim, burgundy backlight and graphite fill.
- `src/DigitalMarketingPage.tsx` — mounts the scene only on this route and exposes loading, ready and
  error states plus a visible static fallback notice.
- `src/digital-marketing.css` — scoped canvas, fallback transition and error-notice styling.

### Phase C verification summary

- `npm run build` passed. The renderer is emitted as a separate `digitalScene-*.js` chunk; the homepage
  keeps its own HTML entry and chunks. The scene code is requested only by `DigitalMarketingPage`.
- Production preview and Vite dev returned HTTP 200 for `/`, `/digital-marketing/`, `/digital-marketing`,
  the optimised character GLB and the Earth land mask.
- `scripts/verify_character_glb.mjs` passed again: original clip name, 9.9667 s duration, 195 tracks,
  299 keys per track, 65 bones, 7 skinned meshes and loop seam within tolerance.
- Land-mask spot checks matched expected geography: Sahara/Brazil/Australia/Greenland land,
  Pacific/Atlantic ocean. `IcosahedronGeometry` UV orientation is accounted for in both the shader and
  particle sampling; the initial rotation turns Africa/Europe toward the camera without mirroring.
- `git diff` confirms no changes to `index.html`, `src/style.css`, `src/pages.ts`, `src/main.tsx`,
  `src/HeroCamera.tsx`, `src/studioCamera.ts`, `src/StudioAtmosphere.tsx`, `src/InteractiveSmoke.tsx`
  or `src/Scene.tsx`.
- At the time of the original Phase C build no browser was available; that limitation was resolved for the
  visual correction recorded below, which supersedes this note.
- Screens, atmospheric smoke, ambient particles, advanced post-processing, cursor parallax, scroll
  animation, GSAP choreography and homepage transition remain intentionally out of scope for Phase C.

### Phase C visual correction (after user review)

The first Phase C render was rejected. It was corrected in place; no phase was skipped and no new route,
navigation link or homepage change was introduced.

- A real shader failure was found: the custom `Reflector` fragment shader re-included Three's
  `tonemapping_pars_fragment` and `colorspace_pars_fragment`, which the WebGLProgram prefix already supplies.
  Removing those two includes made the planar reflection compile and render. Do not re-add them.
- Typography was rebuilt as small letter-spaced `DIGITAL`, large italic `MARKETING` and a
  `STRATEGY · CONTENT · CAMPAIGNS · GROWTH` tagline, matching the approved composition. Vertical padding no
  longer resolves against container width, and the Phase B scroll cue was removed because it collided with
  the figure's feet. The header wordmark is now two-tone (`MYBI` white, `Digital` burgundy) and the Contact
  control is a burgundy-outlined pill.
- The camera sits at chest height looking slightly up; the figure occupies roughly 39% of viewport height
  and the globe roughly 38%, centred behind the head and shoulders.
- The globe is now a warm holographic sphere: finer, hash-varied land dots, soft coastline edges, a
  directional light term, a pink side rim and fewer geographic particles. The land mask was re-checked and
  is north-up; it was not flipped. The three orbital rings were tightened around the globe and brightened.
- The floor is unlit near-black with a radial alpha fade into the backdrop, so the hard horizon seam is gone.
  The planar reflector uses a compact 26 m plane at 512², concentrated on the stage, with two crisp warm
  stage rings and a localized cool sheen plus a faint burgundy globe reflection pool. The atmosphere halo
  lives on camera layer 1 so it cannot smear into the layer-0 reflection camera.
- The character's metallic/glossy material treatment was removed, environment response lowered, base colour
  darkened and alabaster rim raised. Because all garments share one atlas material, the shoe mesh was given
  its own cloned material instance so only the footwear could be darkened further. The original idle clip
  and its loop are unchanged.
- Lighting was rebalanced: low cool key, stronger alabaster rim, burgundy/accent backlight and low fill.

#### Phase C correction verification

- `npm run build` passed; `digitalScene-*.js` remains a separate dynamic chunk and the homepage keeps its
  own HTML entry and chunks.
- Production preview returned HTTP 200 for `/`, `/digital-marketing/`, `/digital-marketing`, the character
  GLB and the Earth land mask.
- Headless Chrome with SwiftShader rendered the real WebGL page. True CDP viewports of 1440×900 and
  390×844 reached `--ready` with `scrollWidth` equal to viewport width and no overlapping typography or
  Contact control.
- Browser console showed no shader or runtime errors; only SwiftShader `ReadPixels` performance warnings.
- Keyboard Tab reaches the Contact control with a visible 2 px focus outline.
- With `prefers-reduced-motion: reduce` emulated, CSS animation resolved to `none`, the scene reached
  `--ready`, and two screenshots 1.3 s apart were byte-identical: one static frame, no idle loop.
- `document.hidden` handling pauses the loop in code. A CDP visibility override is not available in this
  Chrome build, so that toggle was not runtime-tested.
- `git diff` still shows no changes to `index.html`, `src/style.css`, `src/pages.ts`, `src/main.tsx`,
  `src/HeroCamera.tsx`, `src/studioCamera.ts`, `src/StudioAtmosphere.tsx`, `src/InteractiveSmoke.tsx`
  or `src/Scene.tsx`.
- Phase D items remain out of scope: eight screens, in-scene smoke, ambient particles, post-processing,
  GSAP choreography, cursor/scroll motion and homepage transition. Awaiting explicit user approval.
