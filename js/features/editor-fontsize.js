/* Feature: Editor Font Size — A-/A+ chips to resize the CodeMirror editor font (10–24px), persisted. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var MIN = 10;
      var MAX = 24;
      var DEFAULT = 14;
      var STEP = 2;
      var KEY = "editor-fontsize.px";

      MS.injectCSS(
        [
          ".editor-fontsize-label {",
          "  display: inline-flex;",
          "  align-items: center;",
          "  min-width: 3ch;",
          "  justify-content: center;",
          "  padding: 0 4px;",
          "  font-size: 12px;",
          "  color: var(--text);",
          "  opacity: 0.75;",
          "}",
          /* Apply chosen size to the CodeMirror surface via a data attr on <html>. */
          "html[data-editor-fontsize] .CodeMirror {",
          "  font-size: var(--editor-fontsize, 14px);",
          "}"
        ].join("\n"),
        "editor-fontsize-css"
      );

      function clamp(px) {
        px = Math.round(Number(px));
        if (!isFinite(px)) px = DEFAULT;
        return Math.max(MIN, Math.min(MAX, px));
      }

      var current = clamp(MS.get(KEY, DEFAULT));
      var label = null;

      function apply(px, persist) {
        try {
          current = clamp(px);
          document.documentElement.setAttribute("data-editor-fontsize", "1");
          document.documentElement.style.setProperty("--editor-fontsize", current + "px");
          if (label) label.textContent = current + "px";
          var ed = MS.getEditor();
          if (ed && typeof ed.refresh === "function") ed.refresh();
          if (persist) MS.set(KEY, current);
        } catch (e) {
          console.error("[editor-fontsize] apply failed", e);
        }
      }

      // A- chip
      MS.addEditorButton({
        id: "editor-fontsize-dec",
        title: "Decrease editor font size",
        label: "A-",
        onClick: function () {
          apply(current - STEP, true);
        }
      });

      // Current size label (chip host appends in order).
      label = MS.addEditorButton({
        id: "editor-fontsize-label",
        title: "Editor font size",
        label: current + "px",
        onClick: function () {
          apply(DEFAULT, true);
        }
      });
      if (label) {
        label.classList.add("editor-fontsize-label");
        label.textContent = current + "px";
      }

      // A+ chip
      MS.addEditorButton({
        id: "editor-fontsize-inc",
        title: "Increase editor font size",
        label: "A+",
        onClick: function () {
          apply(current + STEP, true);
        }
      });

      // Restore persisted size on load.
      apply(current, false);
    } catch (e) {
      console.error("[editor-fontsize] init failed", e);
    }
  });
})();
