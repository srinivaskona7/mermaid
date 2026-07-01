/* Feature: System Theme Sync — a topbar "Auto" toggle that follows the OS color scheme */
/* No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SETTING_KEY = "auto-theme.enabled";
      var mql = null;
      var enabled = false;
      var btn = null;

      MS.injectCSS(
        "\n" +
        ".auto-theme-btn.is-on{\n" +
        "  border-color: var(--accent);\n" +
        "  color: var(--accent);\n" +
        "}\n" +
        ".auto-theme-btn.is-on .auto-theme-dot{\n" +
        "  background: var(--accent);\n" +
        "}\n" +
        ".auto-theme-dot{\n" +
        "  display:inline-block;\n" +
        "  width:8px; height:8px;\n" +
        "  border-radius:999px;\n" +
        "  background: var(--border);\n" +
        "  margin-right:6px;\n" +
        "  vertical-align:middle;\n" +
        "}\n" +
        ".auto-theme-btn{\n" +
        "  border-radius: var(--radius);\n" +
        "}\n",
        "auto-theme-css"
      );

      function prefersDark() {
        try {
          return !!(mql && mql.matches);
        } catch (e) {
          console.error("[auto-theme] prefersDark", e);
          return false;
        }
      }

      function applyFromOS() {
        try {
          MS.setDark(prefersDark());
        } catch (e) {
          console.error("[auto-theme] applyFromOS", e);
        }
      }

      // Change handler — only acts while Auto is enabled, so it never fights manual control.
      function onSchemeChange() {
        try {
          if (enabled) applyFromOS();
        } catch (e) {
          console.error("[auto-theme] onSchemeChange", e);
        }
      }

      function reflectButton() {
        try {
          if (!btn) return;
          btn.classList.toggle("is-on", enabled);
          btn.title = enabled
            ? "Auto theme: ON (following OS color scheme)"
            : "Auto theme: OFF (manual dark toggle in control)";
          btn.setAttribute("aria-pressed", enabled ? "true" : "false");
        } catch (e) {
          console.error("[auto-theme] reflectButton", e);
        }
      }

      function setEnabled(next, persist) {
        try {
          enabled = !!next;
          if (persist !== false) MS.set(SETTING_KEY, enabled);
          reflectButton();
          // When turning on, immediately sync to the OS. When off, leave the
          // current (manual) theme untouched — do not fight the dark toggle.
          if (enabled) applyFromOS();
        } catch (e) {
          console.error("[auto-theme] setEnabled", e);
        }
      }

      // ---- matchMedia setup (guarded — API may be missing in some envs) ----
      try {
        if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
          mql = window.matchMedia("(prefers-color-scheme: dark)");
          if (mql) {
            if (typeof mql.addEventListener === "function") {
              mql.addEventListener("change", onSchemeChange);
            } else if (typeof mql.addListener === "function") {
              // Legacy Safari / older browsers.
              mql.addListener(onSchemeChange);
            }
          }
        }
      } catch (e) {
        console.error("[auto-theme] matchMedia init", e);
      }

      // ---- Topbar toggle button ----
      btn = MS.addTopbarButton({
        id: "auto-theme-btn",
        label: "Auto",
        icon: '<span class="auto-theme-dot" aria-hidden="true"></span>',
        title: "Auto theme",
        onClick: function () {
          setEnabled(!enabled, true);
          try {
            MS.toast(enabled ? "Auto theme: following OS" : "Auto theme: off");
          } catch (e) {
            console.error("[auto-theme] toast", e);
          }
        }
      });
      if (btn) {
        try {
          btn.classList.add("auto-theme-btn");
        } catch (e) {
          console.error("[auto-theme] classList", e);
        }
      }

      // ---- Command palette entry ----
      MS.registerCommand({
        id: "auto-theme.toggle",
        title: "Auto Theme: Toggle following OS color scheme",
        run: function () {
          setEnabled(!enabled, true);
        }
      });

      // ---- Restore persisted flag; apply immediately if it was on ----
      var restored = false;
      try {
        restored = !!MS.get(SETTING_KEY, false);
      } catch (e) {
        console.error("[auto-theme] restore", e);
      }
      setEnabled(restored, false);
    } catch (e) {
      console.error("[auto-theme] init", e);
    }
  });
})();
