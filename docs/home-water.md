# Homepage water

The homepage automatically enhances its existing CSS water with SPHjs CPU physics at
0.8×, Light & depth, refraction, surface foam and angled light shafts. The specimen keeps
its comparison controls; no prototype controls or extra reference icon appear on the site.
The whole composition sits inside an inset glass with a light rim, modest rounded
corners and a blue gradient. The surrounding page is white; refraction reconstructs
the gradient relative to the glass rather than the page.
The existing grid, typography and Safari backdrop workaround remain intact.

## Startup and fallback

The initial HTML always includes the current still-water image and CSS bubbles. An empty,
invisible fixed canvas adds no blank loading state. The small homepage controller imports
the solver/renderer only when motion is appropriate, decodes the existing icon asset and
settles the starting pool behind the CSS treatment. It reveals the canvas only after a
successful frame. The replaced CSS bubbles pause while hidden.

No JavaScript, module failure, unavailable WebGL2, shader errors or context loss retain or
restore CSS water. The Canvas 2D circles remain a specimen fallback rather than appearing
on the homepage. Reduced-motion preference keeps the CSS treatment, whose existing media
query also stops its bubbles. Hidden tabs and page-cache suspension stop the animation
loop; resuming discards time debt. Failed renderers release their graphics resources.

## Responsive depth and interaction

The starting number adapts to the existing CSS water height, using 0.8× particle scale
and an approximate settled-packing factor. The homepage has a bounded 1,800-particle
budget; the specimen retains its 1,200 limit. A small canvas bleed extends the simulation
beyond the visible glass and clips it back to the rounded interior, so water meets its
sides and base. The CSS fallback uses the same inset and bottom corners. The rim is a
pseudo-element of the existing main, with no additional layout wrapper.

Click/tap on non-interactive page content pours up to 60 particles from that position.
The amount accumulates for the visit. Links, form controls and text selection are ignored.
At capacity, taps disturb the surface without replacing old particles. Rotation adapts
the designed baseline while retaining additions within the budget; small browser-bar
height changes preserve the current particle state. Nothing is stored between visits.

The known page gradient, original app icon and Bytepie credit supply the backdrop for
image refraction. The credit is repainted from its laid-out text and high-resolution CSS
mask source when layout changes, so both the byline and logo remain visible through
water. The original HTML stays accessible, and the icon keeps its designed position
and size. This shader does not capture arbitrary HTML behind the canvas.

## Verification

Run `npm run build`, `node --test test/*.test.js`, and `git diff --check`.
Six focused checks cover the existing solver and foam, responsive homepage starting pools,
rotation additions and a full 1,800-particle pool with finite bounded positions.

Browser checks on 22 October 2026 in the Mac in-app browser verified automatic startup,
CSS-to-canvas handoff, edge coverage, click interaction, portrait/landscape layout, and
credit refraction in a temporary fully submerged layout. Checks also covered
CSS-only water in a sandboxed iframe with JavaScript disabled. Temporary fixtures also
verified the fallback with WebGL2 disabled and the startup guard with a reduced-motion
JavaScript media-query response. Real iPhone Safari browser chrome and device performance
still require a device check. The current build is local and uncommitted; nothing has
been published. Retain the SPH source attribution and the license-notice follow-up recorded
in the study notes before publishing.
