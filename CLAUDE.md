# Luhz — Tecnologia Criativa · Institutional Website

React (Vite) institutional site for Luhz, a Brazilian creative-technology company
(interactive experiences for museums/art spaces, live marketing, automation
platforms, robotics).

## Brand context

- Positioning: Luhz is a **creative technology lab** — it connects experiences
  with technology (hardware + software, "from sensor to cloud") to create
  valuable, remarkable memories. Focus on modern techniques and best practices:
  highly available, scalable, business-connected solutions.
- Member track record (exhibitions/live marketing): "Pegadas do Pequeno
  Príncipe" (interactive gramophone, presence-triggered rotary telephone,
  presence-triggered spatial audio, image filters); "Chaves: A Exposição"
  (world's biggest Chaves exhibition — jukebox, liquid-pouring frame recreating
  an episode, motorized scenographic aircraft); Heineken at Rock in Rio (20+
  lidar sensors + laser modules + sound reacting to presence, touch-sensitive
  plants — nature × technology); Nike totem (sound-loop mixing, 2-camera 30s
  video capture, QR-code download, Nike/Artwalk masks).
- Member track record (software): event-generation platform (user connections,
  chat, lecture/subscription management), RSVP platforms with custom business
  rules and data integrations, high-demand public voting, high-volume marketing
  asset automation, machine learning applications. End-to-end engineering:
  cloud, scalability, databases, CI/CD.
- Brands in members' portfolios: MIS, Shell, Heineken, Nike, Artwalk, Ray-Ban,
  Ingresse, RIO2C, BAT. **Important:** Luhz is a new brand — members worked
  with these brands in previous journeys, not Luhz directly. Always present
  this with that disclaimer.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview the production build

## Architecture

Strictly organized by layer/feature, one folder per topic/page/feature:

```
src/
  shared/                   # Shared across both layers
    styles/                 # Global styles, CSS variables (variables.css), fonts
    i18n/                   # Translation files and LanguageContext
  institutional/            # Marketing / landing page layer
    components/             # Navbar, HomeSection, FeaturesSection, …
    pages/
      Home/
  platform/                 # SaaS app layer (future)
    components/
    pages/
```

- Each component lives in its own folder: `ComponentName/ComponentName.jsx` +
  co-located `ComponentName.module.css`.
- Pages live in `pages/<PageName>/` and compose components; keep logic in
  components, not pages.

## i18n — mandatory for all user-visible text

- All user-visible text must go through the translation system. No hardcoded
  strings in JSX — including `aria-label`s and alt text.
- Translation files: `src/shared/i18n/en.js` and `src/shared/i18n/pt.js` — one
  file per language. **Both files must always be updated together.**
- Access translations via the `useLanguage()` hook from
  `src/shared/i18n/LanguageContext.jsx`:
  ```jsx
  import { useLanguage } from '../../../shared/i18n/LanguageContext'; // from institutional/components/*
  const { t } = useLanguage();
  ```
- Keys are namespaced by section/component (e.g. `t.nav.*`, `t.hero.*`,
  `t.features.*`). Add a new namespace for each new section.
- When a heading has an accented/highlighted word, split it into `titleText` +
  `titleAccent` keys.
- Default language is `pt`; `useLanguage()` also exposes `language` and
  `setLanguage`.

## Styling

- **No inline CSS.** All styles live in `.css` / `.module.css` files. Never use
  the `style` prop on JSX elements. (GSAP animating properties at runtime is the
  only accepted way styles are set from JS.)
- Component-scoped styles use CSS Modules (`ComponentName.module.css`)
  co-located with the component.
- Global/shared styles and design tokens live in `src/shared/styles/`
  (`variables.css` is imported globally via `global.css`).
- **Rule:** layout code consumes only semantic tokens (`--color-bg`,
  `--color-text`, `--color-line`, `--color-accent`, …). Brand palette tokens
  (`--brand-*`) are defined once in `variables.css` and mapped into semantic
  tokens per theme.

## Theming (light/dark)

- Theme is controlled by `data-theme="dark" | "light"` on `<html>`. Dark
  ("lights off") is the default; the hero light-switch flips it.
- Semantic tokens swap per theme in `variables.css`; elements that change with
  the theme should transition using `var(--theme-transition)`.

## Animation

- GSAP with the `useGSAP()` hook from `@gsap/react` (scope every animation to a
  section ref; use `contextSafe` for event handlers).
- DrawSVG (free since GSAP 3.13) powers the hand-drawn stroke animations.
- GSAP targets DOM nodes via `data-*` attributes (e.g. `[data-draw="bulb"]`),
  never via CSS Module class names (they are hashed).
- Always respect `prefers-reduced-motion`: skip/instant-set animations when the
  media query matches.

## Sound

- All sound is synthesized in-browser with the Web Audio API — no audio asset
  files. The engine lives in
  `src/institutional/components/LabSection/audioEngine.js` (one shared
  AudioContext, master gain, mute, one-shot voices + a lookahead sequencer).
- Sound only ever plays as a direct result of user interaction, and the
  AudioContext is created/resumed via `engine.unlock()` inside interaction
  handlers (browser autoplay policy). Hover-triggered sounds may be silent
  until the first click/tap — that is expected.
- Any section with sound must offer a mute toggle (translated labels).

## WebGL

- Interactive type is raw WebGL — no three.js. The text is rasterized to a 2D
  canvas texture, then tinted/animated in a fragment shader. Shared conventions:
  theme colors resolved from CSS vars via a probe element and refreshed on
  `data-theme` changes; texture rebuilt on width change (ResizeObserver);
  reduced motion renders one static frame; the render loop pauses via
  IntersectionObserver when off screen; the accessible text lives in a
  visually-hidden/fallback element (also shown if WebGL is unavailable).
- Each usage gets a **distinct** effect (avoid repetition):
  - ContactSection `LuhzText` — white alpha mask, liquid push + wobble +
    chromatic split toward the cursor; idle = a slow phantom cursor drifts.
  - AboutSection `ShaderTitle` — two-tone texture (body + amber accent), an
    ember glow with a travelling warm light band + flicker + a slow undulation
    wave. Ambient only (no pointer interaction).
  - ShowcaseSection `ShowcaseBackground` — a `gl.POINTS` particle field behind
    the content, advected by a **curl-noise flow field**: an evolving 3D
    value-noise potential is sampled on a grid, its curl gives a
    divergence-free velocity field, and particles bilinearly sample it and wrap
    at the edges. Produces ink-in-water filaments and eddies that form and
    dissolve without collapsing. Physics runs on the CPU; positions upload to a
    dynamic buffer each frame.
    Kept subtle so the phone/video stays the focus. Particle color is the
    theme-aware `--color-particle` token (bright amber on dark, deeper amber on
    light) so it stays visible in both themes.

## Contact form & integrations

- The contact form uses **Cloudflare Turnstile**. Set `VITE_TURNSTILE_SITE_KEY`
  in a `.env`; it falls back to Cloudflare's always-pass TEST key in dev. The
  matching SECRET key must verify the token server-side.
- The form POSTs JSON `{ name, email, company, message, turnstileToken }` to
  `VITE_CONTACT_ENDPOINT`. While that is unset it simulates a successful send and
  logs the payload (dev only).

## Design language

- Concept: "Luhz" ≈ "luz" (light). Hand-drawn sketch aesthetic (wobbly SVG
  strokes, round caps) + clean geometric type.
- Fonts: Sora (UI/brand), Caveat (handwritten accents) — loaded in
  `index.html`.
- All pages must be responsive for desktop and mobile.
