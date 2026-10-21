# Website fonts and assets

## Fonts

Fonts are self-hosted from `src/assets/fonts/` and registered in `src/styles/_fonts.scss`. The shared tokens live in `_tokens.scss`.

| Font | File | Role | Token |
| --- | --- | --- | --- |
| Adobe Caslon Pro Regular | `ACaslonPro-Regular.woff2` | Body copy, headings and supporting text | `--font-body` |
| Agbalumo Regular | `Agbalumo-Regular.woff2` | Watered brand lettering | `--font-brand` |

Both web fonts were converted from the supplied desktop font files. Frank confirmed permission to use Adobe Caslon Pro on the website; retain the original licence separately. Agbalumo's SIL Open Font License is included as `src/assets/fonts/OFL.txt` and must accompany redistribution.

Only regular (400, normal) faces are supplied. Any bold or italic styles currently use browser synthesis. `font-display: swap` keeps text readable while fonts load, with Georgia and generic serif fallbacks.

The typography specimen shows both families. The homepage wordmark stays live text, using `wordmark-texture.png` as its clipped fill.

## Branding and icons

Frank supplied the app icon and Bytepie logo exports. The homepage app icon has a 1× and 2× source, including its external shadow; favicon and home-screen exports omit that padding.

- `src/favicon.ico` bundles the separate 16px, 32px and 48px PNG artwork.
- `apple-touch-icon.png` is 180 × 180px.
- `icon-192.png` and `icon-512.png` are referenced by `src/site.webmanifest`.
- `logo-bytepie.png` supplies the CSS mask for the readable Bytepie credit.

Image files are under `src/assets/images/`. Eleventy copies that directory through `src/assets`; the favicon and manifest have explicit root-level copy mappings.

## Water

See [water-study-assets.md](water-study-assets.md) for the generated water texture's provenance and prompt.

The homepage and third water specimen share `src/_includes/components/water.njk` and `src/styles/_water-still.scss`. The still texture, SVG mask and highlight render without JavaScript. Only the decorative CSS bubbles animate, and reduced-motion preferences hide them. The complete decoration is excluded from the accessibility tree.

Homepage depth and reserved content space share `--home-water-height` in `_home.scss`: a quarter of the small viewport on desktop, with a shallow phone strip and separate portrait/landscape adjustments.
