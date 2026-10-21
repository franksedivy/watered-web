# Water simulation study — #6

## Scope and entry point

Open `/specimen/water/`. One page contains the interactive SPHjs study first, followed
by CSS waves, rolling water, and still water with CSS bubbles. All three CSS alternatives
work without JavaScript and retain their own pause controls. The specimen index and Water
navigation point to this page. The homepage shares the selected rendering through its own
automatic controller; this specimen retains all comparison controls.

Following Frank’s review on 22 October 2026, SPH is the remaining physics experiment.
LiquidFun and its WASM runtime have been removed, along with the separate engine pages.
This browser choice does not establish native iOS integration feasibility.

## Experiment rules

- Start with 240 particles. Each tap or keyboard-accessible Add water action adds up to 60.
- Stop at the displayed limit, at most 1,200. Larger particle sizes reduce that limit.
  No particle expiry, replacement, persistence or real-world volume claim.
- Pour here introduces particles around the selected position with downward velocity.
- Raise and disturb introduces the dose at an estimated pool surface and applies a local
  impulse. That estimate uses particle count and spacing, not a measured surface mesh.
- Reset restores 240 particles at the applied size. Pause freezes the solver; adding remains possible.
- Fixed 60 Hz physics, at most three catch-up steps per frame. Discard excessive time debt.
- Suspend the animation loop when paused, offscreen or hidden. Resume without catch-up.
- Resize preserves particle count and normalized positions, rebuilds boundaries/render targets,
  and reflows controls. Particles retain their simulation size, so depth changes with tank shape.
- Reduced motion starts with Animate water unchecked. Calm mode shows an instantly rising
  flat pool with no continuous physics or rendering. Tapping and Add water still work.
- Without JavaScript, or on loading/rendering failure, retain the still-water artwork and copy.
  The CSS studies below remain available. The specimen solver loads only after Start SPHjs.

## SPHjs source

[Upstream](https://github.com/asadm/SPHjs), pinned to
`d3b273deab91a75205ba52c9dc8365787524a92d` (24 August 2026).

The specimen uses the CPU `SPH` module and its typed-array positions, fixed-step `step`,
`addParticle`, `push`, `clear`, and `resize`. The separate WebGPU solver is not enabled.
No WebGPU benchmark or automatic CPU/GPU switching is claimed. No npm release is assumed:
the inspected upstream package is private. The solver and rendering are self-hosted.

Upstream's README declares MIT but this revision has no separate LICENSE/full MIT notice.
The README and attribution remain beside the unmodified solver; resolve the notice gap
before production selection. The pinned revision does not establish ongoing maintenance.

SHA-256 of `src/assets/vendor/sphjs/SPH.js`:
`e8e7dd0f752e134732bb19deea64f0f864252e0527eb1f4bd5db5a06d127bb2a`.

## Surface treatments

Water surface retains Original and Light & depth. Original uses WebGL2 particle-density
accumulation to form a blue silhouette. Light & depth uses the same field with a bounded
upward search and binary refinement to estimate depth below the surface. Depth colour,
partial transparency, density-gradient normals, reflected highlights and moving light
patterns change its appearance without changing the physics.

This is an illustrative 2D optical treatment. Procedural light patterns suggest caustics;
image displacement distorts the submerged reference icon. No 3D scene is ray-traced.
It adds no rendering library or image asset. Canvas 2D retains the simple overlapping-circle
fallback. WebGL2 is required for surface shading. Calm mode retains its flat pool.

The selector never resets the solver, changes particle size or affects the raw inspection
view. Light animation advances only with simulation steps: Pause, calm mode, hidden tabs
and offscreen suspension freeze it. Reflection intensity still needs gentler tuning after
Frank’s review; this page consolidation retains the current treatment and options.

## Particle inspection and size

Show particles bypasses water shading and draws outlined amber markers from the same
position buffers, without restarting or changing physics. It works while paused and in
calm mode, including the Canvas 2D fallback. The 3-unit dot radius at 1× is a display marker,
not a rigid collision disc. Show interaction radius draws the actual smoothing/search
radius, 32 simulation units at 1×. Colours distinguish adjacent IDs, not physical quantities.

Particle scale starts at 0.8× and ranges from 0.5× to 1.5×. Moving the slider previews a value; Apply size & reset
applies it and restores 240 particles while retaining pause, surface and inspection settings.
SPH rebuilds its spatial grid at the scaled smoothing radius and scales pressure coefficients
and boundary padding. Seeding/dose spacing, markers and rendering kernels scale with it.
These are experimental presets, not a resolution-independent convergence experiment.

Large particles use a cap of floor(1200 / scale²); smaller sizes retain the 1,200 performance
cap. Thus 1.5× permits 533 particles, with a partial final dose if necessary. Changing size
starts a fresh experiment rather than preserving the previous pool's volume.

## Verification and remaining review

Run `npm run build`, `node --test test/*.test.js`, and `git diff --check`.
The two focused tests execute the actual SPH solver through 0.5× → 1.5× → 1×, additions,
capacity, settling, portrait/short resize, finite bounded positions, repeated resets and
clearing. They do not establish rendering quality or real-device performance.

Earlier Mac in-app-browser checks initialized both surface treatments, exercised both tap
modes, pause/reset, raw markers, interaction rings, calm-mode additions and size application.
Brief desktop samples around 60 fps are observations, not controlled benchmarks or evidence
for real-phone performance. The live metrics report frame p95 and physics time per frame.

Review the consolidated page on iPhone Safari for initial pool appearance, repeated taps,
full capacity, orientation changes and background/resume. Check keyboard, reduced motion
and loading failures on target browsers. Confirm the PR Deploy Preview after Frank commits
and pushes. The specimen remains the comparison tool; homepage integration is described in `home-water.md`.

Consolidation checks on 22 October 2026: the main water page initialized SPH and retained
both water surfaces, particle/radius inspection, size apply/reset, pause and calm-mode
additions. Scrolling to the CSS alternatives suspended SPH. A 402 × 874 iframe check
confirmed the control wrapping and a working CSS pause control with JavaScript disabled.
The production build and both SPH tests pass after removal of the other engine runtime.

## Submerged icon reference

The SPH tank includes the existing app icon (with its 2× asset) behind all water layers.
Its centre sits approximately at the starting pool surface, using the same amount/area
estimate as calm mode. It stays fixed when water is added, so the icon becomes covered.
Changing particle scale or resizing recalculates the initial reference position. The icon
is 50% larger than the previous reference at the 0.8× base, sized responsively from that
base and held constant while comparing particle presets. It is decorative and does not change physics.
The pre-start/no-JavaScript artwork also has the icon positioned at its waterline.

Browser review confirmed approximately half-submerged placement at the initial 240-particle
amount on desktop and at 402px portrait width, use of the 2× icon asset, and a fixed icon
position while additions increased the count to 420. The pre-start still artwork also
covers the lower half of the icon. No solver or water-shading parameters changed.

## Temporary surface foam

Surface foam is enabled by default and can be toggled for comparison. A decorative
per-particle field reads speed and local surface exposure, whitening the moving upper
layer in either water treatment. It decays after disturbance and advances only with
simulation time, so pause, calm mode and suspension freeze it. Reset and size application
clear it. Raw particle inspection retains its original amber markers; no physics changes.
The existing WebGL2 density pass carries the foam field in its green channel, with a
simple circle treatment for Canvas 2D. This suggests foam rather than simulating air.

After visual review, the exposed band was narrowed by roughly a quarter while retaining
the same brightness and fade. Focused checks cover surface-only activation, buried motion,
unchanged solver data, fading, freeze and clearing, alongside the two SPH regression checks.

## Image refraction

Light & depth now has a Refraction toggle, enabled by default. The renderer uploads the
same responsive icon image used by the DOM and samples it with a small travelling offset
under the particle-defined water silhouette. Above water, the original DOM icon remains
sharp. Below water, a reconstructed tank backdrop and warped icon replace the original
before tint, highlights and foam are composited, avoiding a duplicate straight outline.

Displacement is capped at 3.5 CSS pixels and scales down with small reference icons.
The icon rectangle follows the existing initial-depth placement on resize and size reset.
Time still advances only with physics, so pause, calm mode and suspension freeze the warp.
Original water, raw inspection and Canvas 2D retain their current unwarped treatment.
If the icon cannot be decoded, the shader retains the existing rendering without refraction.
This is image-space distortion of the known icon/backdrop, not 3D optical simulation or
automatic refraction of arbitrary HTML elements behind the canvas.

The default particle scale is now 0.8× in the solver and initial control readout. The
240-particle starting amount and existing range remain unchanged. The reference icon is
50% larger, with its responsive size based on that default rather than the selected scale.

Browser review on 22 October confirmed the refraction toggle works on a paused pool
without resetting its count, and the 0.8× initial control matches the solver default.
A temporary 402 × 874 → 874 × 402 viewport check retained 300 particles and aligned the
reference icon after resizing. The current 2× icon asset is reused. Build and all four
focused checks pass; the homepage remains unchanged.

## Directional light shafts

Light & depth uses nearly straight shafts entering from the upper left at an angle,
rather than an intersecting caustic network. Stable per-shaft seeds vary spacing, width
and brightness. A soft halo, slow shimmer and slight drift avoid a uniform comb; light
fades with depth and distance from the lit side. All motion uses simulation time, so
Pause and suspension freeze it. Foam and image refraction are unchanged.
