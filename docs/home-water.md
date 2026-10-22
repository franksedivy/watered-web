# Homepage water

The homepage automatically enhances its existing CSS water with SPHjs CPU physics at
0.8×, Light & depth, refraction, surface foam and angled light shafts. The specimen keeps
its comparison controls; no prototype controls or extra reference icon appear on the site.
The whole composition sits inside an inset glass with modest rounded
corners and a blue gradient. The surrounding page is white; refraction reconstructs
the gradient relative to the glass rather than the page.
Homepage CSS shadows and glows are omitted, including those on the container, wordmark,
control panel, prompt and fallback bubbles. The glass panel retains its subtle backdrop blur.
The existing grid and typography remain intact; the old extra-height Safari workaround has been removed.

## Startup and fallback

The HTML includes both treatments. On the homepage only, the server renders `no-js`
on the root. A tiny synchronous head check replaces it with
`water-pending` before the stylesheet can paint. Pending shows neither treatment. If
JavaScript is disabled, `no-js` remains and the still-water image/CSS bubbles show normally.

The controller imports the solver/renderer only when motion is appropriate, decodes the
known backdrop assets and settles the starting pool while hidden. After a successful
frame it selects `water-js`, revealing the canvas directly without a CSS-water flash.
Reduced motion, missing WebGL2 or renderer failure select `water-css`. The hidden fallback
retains its measurable depth and pauses its CSS bubbles. Its background, mask and highlight
artwork are requested only after CSS water is selected; the animated homepage does not
download the 1.26 MB still-water texture.

A module load error (or missing module support) selects CSS water through the independent
head check. An eight-second startup watchdog also selects CSS if initialization never
finishes while the page is visible; hidden tabs pause that watchdog. A late module respects that decision and cannot replace it with JS water.
Normal runtime errors or graphics context loss restore CSS water. The Canvas 2D circles
remain a specimen fallback rather than appearing on the homepage. Reduced motion also
stops the CSS bubbles. Hidden tabs/page-cache suspension stop animation and sensor input;
resuming discards time debt. Failed renderers release their graphics resources.

## Responsive depth and interaction

The homepage keeps the 0.8× solver scale but maps it to a fixed 20-CSS-pixel density
sprite, independent of viewport width or Retina density. Desktop particles no longer
magnify with the canvas. This shared size is slightly larger than the former portrait
phone treatment and much finer than the former desktop treatment.

The starting number adapts to the CSS water height and an approximate settled-packing
factor. The initial allocation leaves at least 360 particles for additions, with a minimum budget of 1,800
and a hard ceiling of 10,000 particles. Typical phones retain the smaller allocation;
desktop pools use more particles to keep their depth. Very large screens can start
shallower at the ceiling. The specimen retains its independent 720-unit world and 1,200 limit.

A small canvas bleed extends the simulation beyond the visible glass and clips it back to the rounded interior. Physical wall padding
tracks that bleed so a shallow pool stays inside the visible glass after rotation. Both
water layers sit inside one full-height clipping frame that shares the outer glass's
inset and all four corner radii. This avoids a shallow CSS pool normalizing its own bottom
corners to a smaller radius. There is no separate overlaid border: it produced a second
outline against dark water. The water-only frame does not wrap or alter the content layout.

The homepage advances simulation time at 1.2× for slightly quicker drops and sloshing,
retaining fixed 1/60-second physics steps with at most four steps per frame. High-refresh
screens redraw only after physics advances. The fragment shader exits immediately for
clear pixels, avoiding surface sampling across the empty part of the glass.

Click/tap on non-interactive page content adds a small seven-particle drop with a fuller base and a tapered,
slower-moving tip. It keeps a gentle initial downward velocity. The specimen retains its larger 60-particle pour.
The amount accumulates for the visit. Links, form controls and text selection are ignored.
At capacity, taps disturb the particles nearest the pointer without replacing old water.
The world-units-to-CSS-pixels ratio is constant across viewports and visits. Rotation transforms
particle positions, momentum and gravity into the new screen axes, preserving count and
physical scale. Resizing adjusts the tank without reseeding or hiding the running canvas;
small browser-bar changes retain the existing pool too. Nothing is stored between visits.

The known page gradient, original app icon and Bytepie credit supply the backdrop for
image refraction. The credit is repainted from its laid-out text and high-resolution CSS
mask source when layout changes, so both the byline and logo remain visible through
water. The original HTML stays accessible, and the icon keeps its designed position
and size. This shader does not capture arbitrary HTML behind the canvas.

## Water controls

When JavaScript has selected a water treatment, a bottom panel offers water visibility
and phone tilt. Its compact, translucent background softly blurs the content behind it.
The mobile treatment matches the Figma 64×29px pill, with an Agbalumo prompt reading “Stop!” when water is on and
“Go on, try it!” when it is off and the two supplied divider SVGs. The prompt and icons are white while water
is enabled; water-off restores the blue symbols and gradient text. Button hit areas extend
vertically to 44px while remaining separate across the panel. Desktop viewports show only the water
toggle; the tilt button appears on touch devices below the 60rem desktop breakpoint. The visibility button uses SF Symbols’ `water.waves` while on and
`water.waves.slash` while off. Both controls retain accessible labels.
Turning water off hides both treatments, stops the simulation and CSS bubbles, and
cancels tilt input or an outstanding permission request. Turning it back on restores the
existing pool without adding particles or requesting sensor access. The choice lasts
for this page visit. The visibility control also works with reduced motion or failed
graphics; tilt is disabled whenever animated water or a supported phone is unavailable.
The panel remains hidden with JavaScript disabled.

## Phone tilt

On a secure, touch-capable browser with DeviceOrientation support, the running water shows
an optional icon button using SF Symbols’ `rectangle.portrait.rotate`. It retains a 44px
vertically expanded tap target and an accessible **Enable tilt** label. The symbol switches to
`rectangle.portrait.rotate.slash` while off or unavailable, and the unslashed symbol while
on. Neither button adds a filled highlight; symbols and accessible pressed states
communicate their state across the continuous glass panel.
The descriptions below refer to its accessible labels and status messages. Touch-capable browsers without a secure connection
show a disabled **Tilt needs HTTPS** control; browsers without the sensor API show
**Tilt unavailable**. These states remain visible so local phone testing is understandable. Tapping it requests sensor permission directly within
the gesture on browsers that require it (including iPhone Safari). No prompt or sensor
listener starts on page load. The enabled button is labelled **Disable tilt**; tapping it stops sensor listening
and gently restores normal downward gravity. Denial or unavailable data leaves tap-to-add
water running. Permission feedback is also announced by an accessible status region.

The [Device Orientation and Motion specification](https://www.w3.org/TR/orientation-event/)
defines sensor-derived orientation using accelerometer/gyroscope data. We use beta/gamma
to project gravity onto the display and the [screen orientation angle](https://www.w3.org/TR/screen-orientation/)
to map it into the current viewport. Compass heading is unnecessary. This uses fused tilt,
not raw linear acceleration, so no shake gesture, magnetometer access, calibration prompt,
sensor logging, server transmission or persistence is introduced.

The existing solver smoothly follows gravity at its ordinary strength. A nearly face-up
phone retains a small downward pull so noise does not suspend the pool. Invalid readings are ignored. A valid orientation remains active while the phone is
held at that angle, even when the browser sends no further change events. If no valid reading arrives within four seconds, the control offers
a retry and normal gravity remains. Sensor listening stops while the animation is hidden,
offscreen, suspended or disabled by reduced motion; resume waits for fresh data. Reduced
motion removes the tilt control and keeps the existing calm CSS fallback.

Depth shading, the meniscus and the narrow foam band now use the direction opposite
current gravity when finding the free surface. This keeps those details on the moving
surface when water gathers against a side. The existing angled light shafts remain.

Test on iPhone through an HTTPS Deploy Preview (a plain HTTP LAN address does not qualify
as a secure context). Tap Enable tilt, allow access, tilt both ways, rotate into both
landscapes, return to portrait, toggle tilt off, and background/resume Safari. Actual sensor
hardware, Safari chrome timing and touch responsiveness still need that real-device check.

## Verification

Run `npm run build`, `npm test`, and `git diff --check`.
A temporary in-app-browser sensor fixture verified the actual homepage controller:
permission denial kept normal water running; enabling and reversing tilt moved the pool
between the lower corners. Its 858 particles remained 858 through portrait → landscape
left → landscape right → portrait, and the toggle stopped tilt input. These were simulated
sensor readings with the real solver/renderer, not real iPhone sensor measurements. The
fixture and sensor overrides were removed after verification.

Panel browser checks used a simulated phone viewport and sensor permission: water-off
hid both treatments, froze the physics counter and disabled tilt; restoring water retained
the same particle count. The visibility toggle also hid/paused the CSS treatment after
simulated reduced-motion or WebGL failure. Desktop showed only the water toggle. These
fixtures were removed after verification.

Startup browser checks also verified pending → JS with CSS hidden throughout, CSS water
when WebGL2 was unavailable, a missing module selecting CSS, and an actual script-disabled
iframe retaining `no-js` with only CSS water visible. A delayed-module fixture exercised
the startup watchdog and checked that late JavaScript respected the CSS selection.

Sixteen focused checks cover the solver, gravity-aware foam, responsive starting pools,
rotation with conserved particle state and momentum, fixed particle/drop footprints and bounded small drops,
a full 10,000-particle desktop pool, gravity
mapping in all screen orientations, permission denial/failure, missing readings and held angles,
cancelled requests, sensor suspension/resume and actual water moving to either side.

Browser checks on 22 October 2026 in the Mac in-app browser verified automatic startup,
CSS-to-canvas handoff, edge coverage, click interaction, portrait/landscape layout, and
credit refraction in a temporary fully submerged layout. Checks also covered
CSS-only water in a sandboxed iframe with JavaScript disabled. Temporary fixtures also
verified the fallback with WebGL2 disabled and the startup guard with a reduced-motion
JavaScript media-query response. Real iPhone Safari browser chrome and device performance
still require a device check. Retain the SPH source attribution and the license-notice follow-up recorded
in the study notes before publishing.

## Build and dependency review (22 October 2026)

All browser modules, fonts and artwork are self-hosted. The solver and renderer load
only when animation is appropriate; a visibility or reduced-motion change during their
download postpones initialization. No CDN or runtime package installation is involved.
`npm ci` installs the locked build dependencies. CI now runs the existing physics and
sensor tests before building. Production CSS is compressed; serve/watch CSS stays readable.

`npm audit` reported zero known vulnerabilities. The vendored solver exactly matches
the pinned upstream file (SHA-256 `e8e7dd0f752e134732bb19deea64f0f864252e0527eb1f4bd5db5a06d127bb2a`).
Upstream still declares MIT without a full license notice; that existing production
follow-up remains unresolved in `src/assets/vendor/sphjs/NOTICE.txt`.

The English site uses a 144,032-byte Latin Agbalumo subset instead of the full
458,192-byte font. Accents, combining marks, Latin extensions, punctuation, currency
symbols, layout features and font naming/license records are retained. The original face
remains a fallback for other scripts. To regenerate with FontTools 4.60.2:

```sh
pyftsubset src/assets/fonts/Agbalumo-Regular.woff2 \
  --output-file=src/assets/fonts/Agbalumo-Latin.woff2 --flavor=woff2 \
  --unicodes=U+0000-024F,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2C60-2C7F,U+A720-A7FF \
  --layout-features='*' --name-IDs='*' --name-languages='*'
```

FontTools is a one-off asset tool, not a build dependency; the checked-in subset and
existing OFL notice are all the deployment needs.

Browser audit fixtures confirmed:

- Animated startup requests the Latin font and no still-water artwork, saving about
  1.57 MB of uncompressed image/font data compared with the committed page.
- A synthetic 120 Hz clock produced 630 water draws instead of 1,051 over the same
  661 physics steps; duplicate draws fell from 421 to zero. This checks scheduling,
  not real-device GPU speed. Specimen FPS/p95 now measure actual water draws.
- No-JS, reduced-motion and unavailable-WebGL cases still show CSS water. Reduced
  motion downloads no solver. Changing to reduced motion during a deliberately
  delayed startup avoids engine initialization; restoring motion starts normally.
- Water-off stops physics and hides both treatments; enabling it retains the pool.
  The specimen still starts, adds water and changes shading/particle inspection.
- The Latin subset preserves outlines and advance widths for its 824 characters;
  non-Latin text successfully requests the full font. Family and license metadata
  remain intact.

The isolated clean `npm ci` and production build passed, as did all 16 tests and
`git diff --check`. The temporary browser fixtures were removed. Production CSS is
18,482 bytes, compared with the prior expanded output of 21,256 bytes (before transfer
compression). Final HTTPS Deploy Preview and real-phone verification remain part of
the PR review.
