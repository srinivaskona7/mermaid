# Mermaid Studio

A premium, offline-capable live editor for [Mermaid](https://mermaid.js.org) diagrams.
Type or paste Mermaid code on the left, see it render instantly on the right, then
export as SVG/PNG or share a link. No build step — just static files.

## Features

| Area | Details |
|------|---------|
| **Live editing** | CodeMirror editor with Mermaid syntax highlighting, live debounced render |
| **Diagram types** | Flowchart, sequence, class, state, ER, Gantt, pie, mindmap, gitGraph, journey, timeline, quadrant, sankey, xychart, block, C4, requirement |
| **Templates** | 13 syntax-verified starters + galleries below |
| **Themes** | 5 diagram themes + soft light/dark app UI |
| **Preview** | Pan + zoom, Fit, 1:1, fullscreen, error panel |
| **Export** | SVG, PNG 2×/4×, clipboard, code, `.mmd`, shareable link |
| **Docs** | Multiple named diagrams, autosave, file manager, open `.mmd` |
| **PWA** | Installable, offline via service worker |

### Plugin features (31 modules in `js/features/`)

Each is an isolated self-registering module built against the `MS` plugin API
(`js/features/_API.md`). All load with **zero runtime errors**.

| # | Feature | # | Feature |
|---|---------|---|---------|
| 1 | Command palette (⌘K) | 17 | QR share code |
| 2 | Sequence diagram pack (16 examples) | 18 | Split orientation toggle |
| 3 | Mermaid version selector (11/10.x) | 19 | System theme sync |
| 4 | Diagram config (themeVariables) | 20 | Template gallery (rendered thumbs) |
| 5 | Export to PDF | 21 | Insert snippets |
| 6 | Find & replace (⌘F/⌘H) | 22 | Keyword autocomplete (⌘Space) |
| 7 | Keyboard shortcuts help | 23 | Snapshot history / restore |
| 8 | Flowchart direction toggle | 24 | Copy as Markdown |
| 9 | Preview background modes | 25 | Embed code generator |
| 10 | Preview minimap | 26 | Print diagram |
| 11 | Editor font size | 27 | Line numbers toggle |
| 12 | Word wrap toggle | 28 | Live error gutter |
| 13 | Import from URL / Gist | 29 | More diagram types (15 examples) |
| 14 | Presentation mode | 30 | Accessibility / high-contrast mode |
| 15 | Diagram statistics | 31 | **Auto-fix syntax errors** |
| 16 | App theme editor | | |

**Auto-fix** (editor toolbar → *Fix*, or ⌘K → "Auto-fix"): repairs common mistakes —
smart quotes, `<br>`→`<br/>`, single-dash `->`→`-->`, `=>`→`==>`, and a missing
diagram header — validating each candidate with `mermaid.parse` before applying, so
it never turns valid code invalid. The Fix button pulses when the diagram errors.

### Extending it

Drop a new file in `js/features/`, add its slug to `js/features/index.js`, and
register against `window.MS` inside `MS.ready(...)`. See `js/features/_API.md`
for the full API (events, editor/preview access, modals, toolbar buttons,
commands, persisted settings).

## Run

Any static server works (service worker + manifest need `http://`, not `file://`):

```bash
python3 -m http.server 8777
# open http://localhost:8777
```

## Shortcuts

- `Ctrl/Cmd + S` — save · `Ctrl/Cmd + N` — new diagram · `Esc` — exit fullscreen

## Stack

Static HTML/CSS/JS, no build. CDN: `mermaid@11`, `codemirror@5`, `svg-pan-zoom@3`.

## Files

```
index.html              app shell
css/styles.css          soft professional theme (light + dark) + plugin primitives
js/templates.js         syntax-verified diagram templates
js/app.js               core: editor, render, export, docs, PWA + window.MS plugin API
js/features/            30 self-registering feature modules
js/features/index.js    feature loader (fault-tolerant)
js/features/_API.md     plugin API contract
manifest.webmanifest    PWA manifest
sw.js                   service worker (offline)
icons/icon.svg          app icon
.github/workflows/deploy.yml   GitHub Pages deploy
```

## Verification

- 13 core templates + 31 gallery examples (16 sequence + 15 diagram types) render
  cleanly on Mermaid v11 (validated headlessly via Chrome).
- Full app loads all 30 feature modules with **0 runtime/console errors**;
  gallery/more-types/sequence interactions and 45 registered commands verified headlessly.
