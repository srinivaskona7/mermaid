/* Feature: Word Wrap Toggle — editor-tools chip that toggles CodeMirror line wrapping, persisted */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var STORE_KEY = "word-wrap.enabled";
    var chip = null;

    try {
      MS.injectCSS(
        [
          ".word-wrap-chip.is-active {",
          "  background: var(--accent);",
          "  color: var(--surface);",
          "  border-color: var(--accent);",
          "  border-radius: var(--radius);",
          "}",
          ".word-wrap-chip.is-active svg { stroke: var(--surface); }",
        ].join("\n"),
        "word-wrap-css"
      );
    } catch (e) {
      console.error("[word-wrap] injectCSS failed", e);
    }

    function reflect(on) {
      if (!chip) return;
      try {
        chip.classList.toggle("is-active", !!on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        chip.title = on ? "Word wrap: on" : "Word wrap: off";
      } catch (e) {
        console.error("[word-wrap] reflect failed", e);
      }
    }

    function apply(on, persist) {
      try {
        var ed = MS.getEditor();
        if (ed && typeof ed.setOption === "function") {
          ed.setOption("lineWrapping", !!on);
        }
        reflect(on);
        if (persist) MS.set(STORE_KEY, !!on);
      } catch (e) {
        console.error("[word-wrap] apply failed", e);
      }
    }

    function toggle() {
      try {
        var ed = MS.getEditor();
        var current = ed && typeof ed.getOption === "function"
          ? !!ed.getOption("lineWrapping")
          : !!MS.get(STORE_KEY, false);
        apply(!current, true);
      } catch (e) {
        console.error("[word-wrap] toggle failed", e);
      }
    }

    try {
      chip = MS.addEditorButton({
        id: "word-wrap-chip",
        label: "Wrap",
        title: "Toggle word wrap",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h13a3 3 0 0 1 0 6h-4"/><path d="M13 15l-3 3 3 3"/><path d="M4 18h4"/></svg>',
        onClick: toggle,
      });
      if (chip) chip.classList.add("word-wrap-chip");
    } catch (e) {
      console.error("[word-wrap] addEditorButton failed", e);
    }

    try {
      var saved = !!MS.get(STORE_KEY, false);
      apply(saved, false);
    } catch (e) {
      console.error("[word-wrap] restore failed", e);
    }

    try {
      MS.registerCommand({
        id: "word-wrap.toggle",
        title: "Word Wrap: Toggle",
        run: toggle,
      });
    } catch (e) {
      console.error("[word-wrap] registerCommand failed", e);
    }
  });
})();
