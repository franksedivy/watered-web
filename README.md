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
- `src/specimen/` — typography and layout specimens
- `dist/` — generated output, excluded from Git

## Workflow and deployment

Work on feature branches, reference the relevant issue, and open a PR.
GitHub Actions checks the production build.

Netlify runs `npm run build` and publishes `dist/`, as configured in
`netlify.toml`. Merging to `main` triggers production deployment.

Domain and HTTPS verification for watered.app are tracked in #2.