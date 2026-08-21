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

## What it found, and what came of it

**`ActivityBarItem` was written three times** — here, `chrome.tsx` in the
playground, `shell/ActivityBarItem.tsx` (180 lines) in Advisor. Three
implementations behind one registry name, and every resource module in all three
referenced it as though it shipped with scena.

**Now it does.** `ui/navigation/ActivityBarItem` is the union of what each copy
had grown: badge with a tone and a `badgeLabel`, `pos` for bottom anchoring,
`sectionPath` for a rail that reflects a surface other than the left sidebar.
This app deleted its copy and mounts the builtin. So has Advisor, which is
where the two-badge version came from — the promoted component grew
`secondBadge` rather than Advisor keeping a fork of it. The playground still
carries its own: the registry overwrites silently, so an app that wants its own
keeps it, and knowing that is not the same as relying on it.

The same pass promoted three more: **`ButtonBar`** (the button that goes in a
bar — one component for the title bar and the status bar, the difference carried
by the shell-stamped `[data-surface-role='bar']` in CSS rather than by a prop),
**`ThemePicker`** and **`ThemeModeToggle`**, along with
**`registerThemeController`**, which owns `applyTheme`, storage and the
OS-preference listener so the two widgets can be pure views over
`$/ui/theme/id` and `$/ui/theme/mode`.

`themes.ts` registers a second family for that picker to offer, because
`ThemePicker` renders nothing below two choices — one theme is not a choice. It
is registered as inline tokens rather than as a stylesheet, which is the source
kind the playground's four `?url` CSS themes do not cover.

**`sidebar.activate` is still written three times, and should be.** Here,
`register-boot.ts` in the playground, `shell/commands.ts` in Advisor. scena's
`ActivityBarItem` *executes* it by name but does not define it: what activating
means — which surface, whether it also reveals — is the app's decision. Sharing
the component while keeping the two lines of policy local is the right split.

**The presentation policy is written three times**, and it is four lines each
time. That one may be correct — scena deliberately ships the mechanism and not
the opinion — but the *shape* being identical across three apps is worth noting.

**The explorer had a hand-rolled context menu, and did not need one.**
`Listable` already owns rows, selection, keyboard activation, the table/list
breakpoint and `contextMenuSlot` + `contextFor`. Writing that by hand is exactly
how an app ends up with a fourth copy of a catalog component — worth recording
as the failure mode, since it happened here while writing this app.

**`DefaultShell` ignored the presentation policy** — it rendered from `visible`
and `size` only, so on a narrow viewport a sidebar kept taking width from `main`
instead of lifting over it. Half the mechanism already shipped:
`.oo-surface-scrim` was styled in `styles/surface.css` and
`resolveSurfacePresentation` / `isOverlaid` were exported, but no scena
component ever rendered a scrim. Only Advisor's hand-written `AppShell` did.

**Fixed.** The shell now takes a `presentation` policy, resolves it per surface,
stops reserving width for a surface that no longer takes any, and renders the
scrim — as a `<button>`, so "tap beside it to close" is also true from a
keyboard. It also resizes by each surface's own edge instead of placing a
`ShellSplitter` between them, which is what lets resizing stand down by itself
once a surface floats and has nothing to drag against.

The `PresentationProbe` in the status bar was the complaint; it is now a live
readout of what the policy resolves to at the current size.

(Still minor: `DefaultShell` sets `className="oo-shell"` and no stylesheet
defines that class. It lays itself out with inline styles, so nothing is
broken, but the hook a consumer would expect to style is not there.)

What this does *not* settle is Advisor's `shell/compact.ts` (133 lines plus a
192-line test), which adds drawer *policy* on top: opening a record closes the
drawer, and only one is open at a time. Those are app opinions about two
competing sidebars, and they are the part that should stay in an app — the
mechanism they were built on is now in the shell.

## Layout

```
src/
  main.tsx           boot: stylesheets, theme, render. No lazy App, no wall
  App.tsx            ScenaRoot + DefaultShell
  register-app.ts    everything that goes into a registry
  presentation.ts    this app's PresentationPolicy
  themes.ts          a second theme family, so ThemePicker has a choice to offer
  chrome.tsx         AppTitle and PresentationProbe — what is left once scena
                     ships the rest
  resources/
    notes/           explorer + detail over an in-memory provider
    tags/            a second section, so the activity bar has something to
                     switch between
```

There is no sign-in, so unlike the other two there is no boot/post-login split:
one effect registers the lot. If something in the others only works because of
*when* it is registered, it breaks here and says so.
