/* Feature: Split Orientation — toggle the workspace split between
   horizontal (side-by-side, default) and vertical (editor on top, preview below).
   No external CDN libraries are loaded. */
(function () {
  "use strict";
  MS.ready(function (MS) {
    try {
      var SLUG = "split-orientation";
      var CLASS_VERTICAL = "so-vertical";
      var STORE_KEY = "so.vertical";

      MS.injectCSS(
        [
          /* Vertical mode: stack editor on top, preview below. */
          "#workspace." + CLASS_VERTICAL + " { flex-direction: column; }",
          /* Editor pane's inline width is overridden; it gets a
             proportional height instead. Preview flexes to fill the rest. */
          "#workspace." + CLASS_VERTICAL + " .pane--editor {",
          "  width: auto !important;",
          "  height: var(--so-editor-h, 42%);",
          "  border-right: none;",
          "  border-bottom: 1px solid var(--border);",
          "}",
          "#workspace." + CLASS_VERTICAL + " .pane--preview {",
          "  width: auto !important;",
          "}",
          /* The core resizer is a vertical bar; in vertical mode make it a
             horizontal grabber with a row-resize cursor. */
          "#workspace." + CLASS_VERTICAL + " .resizer {",
          "  width: auto !important;",
          "  height: 6px;",
          "  cursor: row-resize;",
          "}",
          /* Toggle button visual state. */
          ".so-btn.is-active { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }",
        ].join("\n"),
        SLUG + "-css"
      );

      // Toggle icon: two orientations of a split layout.
      var ICON_H =
        '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2">' +
        '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>';
      var ICON_V =
        '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2">' +
        '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>';

      var workspace = MS.el("workspace");
      if (!workspace) {
        console.error("[" + SLUG + "] #workspace not found");
        return;
      }

      var btn = null;

      function resizePanZoom() {
        try {
          var pz = MS.getPanZoom();
          if (pz && typeof pz.resize === "function") {
            // Give the browser a tick to apply the new flex layout first.
            setTimeout(function () {
              try {
                pz.resize();
                if (typeof pz.fit === "function") pz.fit();
                if (typeof pz.center === "function") pz.center();
              } catch (e) { console.error("[" + SLUG + "] panzoom resize", e); }
            }, 60);
          }
        } catch (e) {
          console.error("[" + SLUG + "] resizePanZoom", e);
        }
      }

      function apply(vertical) {
        try {
          workspace.classList.toggle(CLASS_VERTICAL, !!vertical);
          if (btn) {
            btn.classList.toggle("is-active", !!vertical);
            btn.innerHTML = vertical ? ICON_V : ICON_H;
            btn.title = vertical
              ? "Split: vertical (editor on top). Click for side-by-side."
              : "Split: horizontal (side-by-side). Click for editor on top.";
          }
          resizePanZoom();
        } catch (e) {
          console.error("[" + SLUG + "] apply", e);
        }
      }

      function toggle() {
        try {
          var next = !MS.get(STORE_KEY, false);
          MS.set(STORE_KEY, next);
          apply(next);
          MS.toast(next ? "Split: editor on top" : "Split: side-by-side");
        } catch (e) {
          console.error("[" + SLUG + "] toggle", e);
        }
      }

      btn = MS.addTopbarButton({
        id: "soToggleBtn",
        title: "Toggle split orientation",
        icon: ICON_H,
        onClick: toggle,
      });
      if (btn && btn.classList) btn.classList.add("so-btn");

      MS.registerCommand({
        id: SLUG + ".toggle",
        title: "Split Orientation: Toggle horizontal / vertical",
        run: toggle,
      });

      // Restore persisted choice on load.
      apply(!!MS.get(STORE_KEY, false));
    } catch (e) {
      console.error("[split-orientation] load", e);
    }
  });
})();
