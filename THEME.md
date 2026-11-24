# Avaris — theme and services-page brief

## Scope

Keep the approved homepage, including the desktop camera composition and mobile side margins. Add one lens-inspired homepage control linking to one new Services page. No other pages, backend, CMS or contact form are part of this milestone.

## Established visual direction

- Cinematic, minimal, dark studio atmosphere; the camera remains the homepage's main attraction.
- Onyx `#0A0A0A` for the base.
- Blue Slate `#536878` for cool light, subdued surfaces and reflections.
- Alabaster `#E5E4E2` for primary text and highlights.
- Burgundy `#7B1D36` for restrained emphasis; `#9B2946` for focus rings and button outlines. These are the accepted reference accents.
- Montserrat Black, weight 900, uppercase and tightly spaced for display headlines.
- DM Sans for navigation, labels and readable body copy. Body copy starts at 16 px.
- Live drifting and billowing smoke, small cursor-sized fluid wakes, and gently moving burgundy ribbons. Keep smoke behind content. Respect reduced-motion preferences and pause background work in hidden tabs.
- Avoid bright color palettes, purple, generic dashboard styling, excessive cards, unnecessary icons and invented business statistics.

## Homepage services button

Label: **Explore services**.

Design: a compact camera-lens control with concentric focus rings, subtle dial markings, dark glass, an aperture detail and a muted burgundy focus glow. It must look clickable, keep the text legible and have keyboard focus styling. Hover/focus can gently turn the outer focus ring; keep motion restrained.

Placement: in the open lower-left area beside the camera on desktop, aligned near the logo's left inset. This avoids the camera monitor below the headline. On mobile, center the lens control between the headline and camera, preserving the approved camera width and bottom anchoring.

Destination: `/services/`, a real separate page that works on direct load and refresh.

## Services page

Use the same studio background, live smoke, burgundy ribbons, colors and typography. Keep the header minimal with the Avaris home link and Contact control. Use a subtle dark overlay behind the content for readability. Keep the atmospheric layer fixed to the viewport so a longer page does not stretch the smoke renderer.

Opening headline: **Your business. Our full focus.**

Explain that Avaris connects digital marketing, website creation, content and video production for businesses. Present the services as an editorial list with expandable details, rather than a grid of generic cards.

Service groups:

1. Websites & digital experiences — business websites, landing pages, e-commerce and ongoing website care.
2. Digital strategy & campaigns — planning, campaign direction and marketing coordination.
3. Social media & content — content planning, copywriting, social creative and channel management.
4. Video & photography — video shoots, brand films, product photography, reels and post-production.
5. Search & paid media — SEO, local visibility, search ads, social ads and campaign reporting.
6. Branding & design — visual identity, graphic design and campaign creative.
7. Email & customer journeys — email campaigns, automation and customer communication.

Conclude with a short invitation to discuss the business and a Contact action using the existing prototype dialog. Do not invent an email address, phone number, awards, clients, measurable results or pricing.

## Behavior and validation

- Homepage control opens Services; the brand and a clear Home link return to the homepage.
- Service details support touch, keyboard activation, focus and accessible expanded states.
- Direct `/services/` navigation and refresh must work in the production build.
- Preserve homepage camera geometry, headline size, mobile camera margins and existing smoke interaction.
- Check desktop and narrow mobile layouts, horizontal overflow, navigation, service expansion, Contact and reduced-motion handling.
