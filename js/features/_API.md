# Mermaid Studio — Plugin API (`window.MS`)

Every feature is ONE self-registering file at `js/features/<slug>.js`. It must
be a classic script (no `import`/`export`, no ES modules) wrapped in an IIFE, and
must do all its work inside `MS.ready(...)`. It must NOT redeclare globals, must
NOT touch other features, and must fail safe (wrap risky work in try/catch).

## Skeleton (copy this exactly)

```js
/* Feature: <name> — <one line> */
(function () {
  "use strict";
  MS.ready(function (MS) {
    MS.injectCSS(`
      .myfeat-x { color: var(--accent); }
    `, "myfeat-css");            // 2nd arg = unique id, prevents double-inject

    MS.addTopbarButton({
      id: "myfeatBtn",
      title: "Do the thing",
      icon: '<svg viewBox="0 0 24 24" class="ico"><path d="M4 12h16"/></svg>',
      onClick: function () { /* ... */ }
    });

    MS.registerCommand({
      id: "myfeat.run", title: "My Feature: Run", run: function () { /* ... */ }
    });
  });
})();
```

## API surface (all methods on the global `MS`)

### Lifecycle / events
- `MS.ready(fn)` — run `fn(MS)` once the app is booted (or immediately if already booted). **Put ALL your setup here.**
- `MS.on(event, fn)` / `MS.off(event, fn)` / `MS.emit(event, data)`
- Events: `ready`, `render` (`{svg, code, type, el}`), `error` (`{message, code}`), `change` (code string), `docswitch` (doc), `themechange` (theme), `commands` (array)

### Editor
- `MS.getCode()` → string · `MS.setCode(str)` · `MS.replaceSelection(str)` · `MS.getEditor()` (CodeMirror 5 instance) · `MS.focusEditor()`

### Preview / diagram
- `MS.getSvgElement()` → live `<svg>` (may be null) · `MS.getSvgString()` → serialized standalone SVG string
- `MS.rerender()` · `MS.detectType(code)` → "Flowchart" | "Sequence" | … · `MS.getPanZoom()` (svg-pan-zoom instance)

### Diagram config
- `MS.setDiagramTheme(t)` / `MS.getDiagramTheme()` — t ∈ default|neutral|forest|dark|base
- `MS.reinitMermaid()` — call after mutating `mermaid` config
- `MS.MERMAID` — the live `mermaid` object

### Export helpers (reuse, don't reinvent)
- `MS.download(data, mime, filename)` — data may be string or Blob
- `MS.copyText(str)` → Promise · `MS.svgToPng(scale)` → Promise<Blob> · `MS.fileBase()` → safe filename base
- `MS.doExport(kind)` — kind ∈ svg|png|png4|clipimg|code|mmd|link · `MS.makeShareLink()` → URL string

### Documents
- `MS.getDocs()` · `MS.getActiveDoc()` · `MS.createDoc()` · `MS.switchDoc(id)` · `MS.setTitle(str)`

### UI primitives (styled, theme-aware — USE THESE, don't hand-roll)
- `MS.toast(msg)`
- `MS.injectCSS(cssText, uniqueId)`
- `MS.openModal({title, html?|node?, width?, onMount?(body,box), onClose?})` → `{body, box, close}` · `MS.closeModal()`
- `MS.addTopbarButton({id,label?,icon?,title?,onClick,primary?,before?})` → button el
- `MS.addEditorButton({...})` / `MS.addPreviewButton({...})` → chip button el
- `MS.el(id)` (getElementById) · `MS.els` (map of core elements)
- Reusable CSS classes already defined: `.ms-btn`, `.ms-btn--primary`, `.ms-btn-row`, `.ms-input`, `.ms-select`, `.ms-textarea`, `.ms-field`, `.ms-grid`, `.ms-card`, `.ms-card__title`, `.ms-card__body`. Theme vars: `--accent`, `--surface`, `--text`, `--border`, `--radius`.

### Commands (for the command palette feature)
- `MS.registerCommand({id, title, run, keys?})` · `MS.getCommands()`

### Misc
- `MS.isDark()` / `MS.setDark(bool)` · `MS.set(key,val)` / `MS.get(key,default)` — persisted per-feature settings · `MS.TEMPLATES` — template array

## Rules
1. All setup inside `MS.ready`. 2. Namespace DOM ids/classes with your slug. 3. `injectCSS` with a unique id. 4. Use theme CSS vars, never hardcode colors. 5. No new CDN `<script>` unless the feature can't work otherwise (document it). 6. Wrap risky code in try/catch + `console.error`. 7. Must `node --check` clean and not throw on load.
