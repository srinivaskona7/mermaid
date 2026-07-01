/* Feature: Line Numbers Toggle — editor-tools chip "#" that toggles CodeMirror
   line numbers + active-line highlight, reflects state, and persists. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var SLUG = "line-numbers-toggle";
    var KEY = "line-numbers-toggle.on";
    var CSS_ID = "line-numbers-toggle-css";
    var BTN_ID = "lnt-btn";

    try {
      MS.injectCSS(
        [
          "#" + BTN_ID + ".lnt-chip{font-weight:600;line-height:1;}",
          "#" + BTN_ID + ".lnt-chip.lnt-active{",
          "  color:var(--accent);",
          "  border-color:var(--accent);",
          "  background:var(--surface);",
          "  border-radius:var(--radius);",
          "}",
          "#" + BTN_ID + ".lnt-chip.lnt-active .lnt-glyph{color:var(--accent);}"
        ].join("\n"),
        CSS_ID
      );
    } catch (e) {
      console.error("[" + SLUG + "] injectCSS failed", e);
    }

    // Read persisted state (default: on, matching the app's initial editor config).
    var enabled = true;
    try {
      enabled = !!MS.get(KEY, true);
    } catch (e) {
      console.error("[" + SLUG + "] read setting failed", e);
      enabled = true;
    }

    var btn = null;

    function apply(state) {
      try {
        var ed = MS.getEditor();
        if (ed) {
          ed.setOption("lineNumbers", !!state);
          ed.setOption("styleActiveLine", !!state);
        }
      } catch (e) {
        console.error("[" + SLUG + "] apply failed", e);
      }
      reflect(state);
    }

    function reflect(state) {
      try {
        if (!btn) return;
        if (state) {
          btn.classList.add("lnt-active");
          btn.setAttribute("aria-pressed", "true");
          btn.title = "Line numbers: on";
        } else {
          btn.classList.remove("lnt-active");
          btn.setAttribute("aria-pressed", "false");
          btn.title = "Line numbers: off";
        }
      } catch (e) {
        console.error("[" + SLUG + "] reflect failed", e);
      }
    }

    function toggle() {
      enabled = !enabled;
      try {
        MS.set(KEY, enabled);
      } catch (e) {
        console.error("[" + SLUG + "] persist failed", e);
      }
      apply(enabled);
    }

    try {
      btn = MS.addEditorButton({
        id: BTN_ID,
        title: "Toggle line numbers",
        icon: '<span class="lnt-glyph" aria-hidden="true">#</span>',
        onClick: toggle
      });
      if (btn) btn.classList.add("lnt-chip");
    } catch (e) {
      console.error("[" + SLUG + "] addEditorButton failed", e);
    }

    // Restore persisted state on load.
    apply(enabled);

    try {
      MS.registerCommand({
        id: "line-numbers-toggle.toggle",
        title: "Editor: Toggle line numbers",
        run: toggle
      });
    } catch (e) {
      console.error("[" + SLUG + "] registerCommand failed", e);
    }
  });
})();
