## Introducing a CSS framework
Adopt UnoCSS.

Install UnoCSS and configure it for Vite.

Replace the current styles with UnoCSS utilities.

Implementation notes for an AI agent:
- Ensure `unocss` (or `@unocss/vite`) is added to the project's dependencies.
- Add UnoCSS to Vite's plugin list and include any required presets (for example, `preset-mini`).
- Replace existing global CSS or component styles by applying UnoCSS utility classes; review components to pick suitable utilities.
- Run the dev server and verify styling matches expectations; adjust presets or safelist classes for dynamic class names if necessary.
