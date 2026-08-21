# @softov/scena-demo

A small reference app built on scena. Private, never published.

It exists for two reasons the playground cannot serve, because the playground
is a component showcase with an app around it and this is an app with nothing
around it.

## 1. It consumes the package, not the source

The playground's `vite.config.ts` aliases every subpath to `../scena/src`,
which is right for iterating on the library — a library edit is live with no
build step. The cost is that it never exercises what a consumer resolves: the
`exports` map, the emitted `.d.ts`, the CSS `copy-assets.mjs` puts in `dist`.

This app has no aliases. `@softov/scena` resolves through the workspace link
and the package's own `exports`, the way Advisor's does. A broken export map or
a stylesheet `tsc` left behind fails here, before a publish rather than after.

```bash
pnpm --filter @softov/scena build   # required first — this app reads dist/
pnpm --filter @softov/scena-demo dev
```

## 2. It is a third data point

Advisor and the playground each grew their own answer to the same problems. One
app plus one showcase cannot tell you which of those answers is an application
concern and which is a hole in scena. A third one, written from scratch and
deliberately minimal, can — anything all three had to invent independently is a
candidate for the framework.

It also uses **`DefaultShell`**, which neither of the others do — both compose
`SurfaceArea` themselves. That makes the shipped shell the least-exercised
thing in the package, so this app runs it as-is and treats whatever is missing
as a missing feature rather than as something each app quietly writes for itself.

## What it has found so far

**`ActivityBarItem` is written three times.** [`chrome.tsx`](src/chrome.tsx)
here, `chrome.tsx` in the playground, `shell/ActivityBarItem.tsx` (180 lines) in
Advisor. Three implementations behind one registry name, and every resource
module in all three references it as though it shipped with scena. They differ —
Advisor's has badge tones and bottom anchoring, the playground's takes a colour
token — but nobody chose those differences; they are what each app needed on the
day.

**`sidebar.activate` is written three times.** Here, `register-boot.ts` in the
playground, `shell/commands.ts` in Advisor. All three do the same two things:
write the section, then force `visible: true`. Every app discovers that second
line the hard way, because an activity bar that does not open the sidebar it
activates looks broken.

**The presentation policy is written three times**, and it is four lines each
time. That one may be correct — scena deliberately ships the mechanism and not
the opinion — but the *shape* being identical across three apps is worth noting.

**`DefaultShell` ignores the presentation policy.** It renders from `visible`
and `size` only, so on a narrow viewport a sidebar keeps taking width from
`main` instead of lifting over it. The status bar here carries a
`PresentationProbe` that resolves the policy and reports the mismatch live —
narrow the window and it reads `small · policy wants floating · shell still
docked`.

Worse, **half that mechanism already ships**. `.oo-surface-scrim` is styled in
scena's `styles/surface.css`, and `resolveSurfacePresentation` / `isOverlaid`
are exported from the root — but no scena component ever renders a scrim. Only
Advisor's hand-written `AppShell` does. The CSS and the resolver are in the
package; the shell that would use them is not.

(Also minor: `DefaultShell` sets `className="oo-shell"` and no stylesheet
defines that class. It lays itself out with inline styles, so nothing is
broken, but the hook a consumer would expect to style is not there.)

Advisor closes this in `shell/compact.ts` (133 lines plus a 192-line test): a
drawer behaviour keyed on `isOverlaid(resolveSurfacePresentation(...))` rather
than on the size class, with three rules — opening a record closes the drawer,
clicking outside closes it, and only one is open at a time. The only
Advisor-specific thing in it is the policy, which is already a parameter.

That is the next thing to lift, and it is being left until this app has shown
what the API should look like from a second consumer's side.

## Layout

```
src/
  main.tsx           boot: stylesheets, theme, render. No lazy App, no wall
  App.tsx            ScenaRoot + DefaultShell
  register-app.ts    everything that goes into a registry
  presentation.ts    this app's PresentationPolicy
  chrome.tsx         ActivityBarItem, StatusItem, AppTitle, PresentationProbe
  resources/
    notes/           explorer + detail over an in-memory provider
    tags/            a second section, so the activity bar has something to
                     switch between
```

There is no sign-in, so unlike the other two there is no boot/post-login split:
one effect registers the lot. If something in the others only works because of
*when* it is registered, it breaks here and says so.
