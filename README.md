# watered-web

Website for Watered, the awesome hydration tracker Apple forgot.

Built with Eleventy, Nunjucks and SCSS. Generates static HTML and CSS;
essential content and navigation work without browser JavaScript.

## Local development

Requires nvm. From the repository root:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open the URL printed in the terminal. Templates and styles rebuild
automatically. Stop the server with Ctrl+C.

Run `nvm use` when opening a new terminal session.

## Production build

```sh
npm run build
```

Output is generated in `dist/`. Edit source files rather than output.

## Structure

- `src/` — pages and content
- `src/_includes/layouts/` — shared templates
- `src/_data/` — shared data
- `src/styles/` — SCSS styles and design tokens
- `src/assets/` — images, fonts and other static assets
- `src/specimen/` — typography, layout, water treatments and simulation specimens
- `dist/` — generated output, excluded from Git

## Water simulation studies

With the development server running, open `/specimen/water/`. The SPHjs simulation
comes first, with three CSS alternatives below. Start SPHjs to compare pouring with
raising and disturbing the pool. Use Water surface to compare Original with Light & depth,
or Show particles to inspect the solver. The homepage automatically uses 0.8× particles,
Light & depth, refraction and foam, retaining CSS water without JavaScript or when
reduced motion or unavailable graphics prevent animation.

Run the focused physics checks with:

```sh
node --test test/*.test.js
```

See [study notes](docs/water-simulation-studies.md) for pinned runtime sources,
limits, verification and the remaining phone review. See [homepage water](docs/home-water.md)
for the progressive enhancement and interaction behaviour.

## Workflow and deployment

Work on feature branches, reference the relevant issue, and open a PR.
GitHub Actions checks the production build.

Netlify runs `npm run build` and publishes `dist/`, as configured in
`netlify.toml`. Merging to `main` triggers production deployment.

Domain and HTTPS verification for watered.app are tracked in #2.