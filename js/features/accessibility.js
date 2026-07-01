/* Feature: Accessibility Mode — high-contrast overlay + aria-live render announcements.
   No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var SLUG = "a11y";
    var STORE_KEY = SLUG + "-enabled";
    var BODY_CLASS = SLUG + "-mode";
    var LIVE_ID = SLUG + "-live";
    var BTN_ID = SLUG + "Btn";

    try {
      // ---- Themed high-contrast overlay (scoped to a body class) ----
      MS.injectCSS(
        "body." + BODY_CLASS + " { --border: var(--text); }\n" +
        "body." + BODY_CLASS + " .ms-btn,\n" +
        "body." + BODY_CLASS + " .ms-card,\n" +
        "body." + BODY_CLASS + " .ms-input,\n" +
        "body." + BODY_CLASS + " .ms-select,\n" +
        "body." + BODY_CLASS + " .ms-textarea,\n" +
        "body." + BODY_CLASS + " .control,\n" +
        "body." + BODY_CLASS + " .chip {\n" +
        "  border: 2px solid var(--text) !important;\n" +
        "  color: var(--text) !important;\n" +
        "}\n" +
        "body." + BODY_CLASS + " { color: var(--text); }\n" +
        "body." + BODY_CLASS + " a,\n" +
        "body." + BODY_CLASS + " button,\n" +
        "body." + BODY_CLASS + " .control,\n" +
        "body." + BODY_CLASS + " .chip { text-decoration-thickness: 2px; }\n" +
        "body." + BODY_CLASS + " *:focus,\n" +
        "body." + BODY_CLASS + " *:focus-visible {\n" +
        "  outline: 3px solid var(--accent) !important;\n" +
        "  outline-offset: 2px !important;\n" +
        "}\n" +
        "body." + BODY_CLASS + " .control--primary,\n" +
        "body." + BODY_CLASS + " .ms-btn--primary {\n" +
        "  background: var(--accent) !important;\n" +
        "  color: var(--surface) !important;\n" +
        "}\n" +
        "." + SLUG + "-sr-only {\n" +
        "  position: absolute; width: 1px; height: 1px; padding: 0;\n" +
        "  margin: -1px; overflow: hidden; clip: rect(0 0 0 0);\n" +
        "  white-space: nowrap; border: 0;\n" +
        "}\n" +
        ".control." + SLUG + "-on {\n" +
        "  background: var(--accent) !important;\n" +
        "  color: var(--surface) !important;\n" +
        "  border-radius: var(--radius);\n" +
        "}",
        "accessibility-css"
      );

      // ---- aria-live region for render status announcements ----
      var live = document.getElementById(LIVE_ID);
      if (!live) {
        live = document.createElement("div");
        live.id = LIVE_ID;
        live.className = SLUG + "-sr-only";
        live.setAttribute("aria-live", "polite");
        live.setAttribute("aria-atomic", "true");
        live.setAttribute("role", "status");
        document.body.appendChild(live);
      }
      function announce(msg) {
        try {
          // Clear then set so repeated identical messages are re-announced.
          live.textContent = "";
          setTimeout(function () { live.textContent = msg; }, 30);
        } catch (e) {
          console.error("[a11y] announce failed", e);
        }
      }

      // ---- Toggle state + persistence ----
      var enabled = false;
      try { enabled = !!MS.get(STORE_KEY, false); } catch (e) { console.error("[a11y] read state failed", e); }

      function apply(on) {
        enabled = !!on;
        try {
          document.body.classList.toggle(BODY_CLASS, enabled);
          var btn = MS.el(BTN_ID);
          if (btn) {
            btn.classList.toggle(SLUG + "-on", enabled);
            btn.setAttribute("aria-pressed", enabled ? "true" : "false");
            btn.title = enabled ? "Accessibility mode: on" : "Accessibility mode: off";
          }
          MS.set(STORE_KEY, enabled);
        } catch (e) {
          console.error("[a11y] apply failed", e);
        }
      }

      function toggle() {
        apply(!enabled);
        try { MS.toast(enabled ? "Accessibility mode on" : "Accessibility mode off"); } catch (e) {}
        announce(enabled ? "Accessibility mode enabled" : "Accessibility mode disabled");
      }

      // ---- Topbar toggle ----
      MS.addTopbarButton({
        id: BTN_ID,
        label: "A11y",
        title: "Toggle accessibility mode",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="1.6"/><path d="M4 7h16M9 21l3-8 3 8M12 7v6"/></svg>',
        onClick: toggle
      });

      // ---- Command palette entry ----
      MS.registerCommand({
        id: "a11y.toggle",
        title: "Accessibility: Toggle high-contrast mode",
        run: toggle
      });

      // ---- Announce render status ----
      MS.on("render", function (data) {
        try {
          var type = (data && data.type) ? data.type : "diagram";
          announce("Diagram rendered, type " + type);
        } catch (e) {
          console.error("[a11y] render announce failed", e);
        }
      });
      MS.on("error", function () {
        try { announce("Diagram error"); } catch (e) { console.error("[a11y] error announce failed", e); }
      });

      // ---- Apply persisted state on load ----
      apply(enabled);
    } catch (e) {
      console.error("[a11y] init failed", e);
    }
  });
})();
