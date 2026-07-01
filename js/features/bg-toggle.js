/* Feature: Preview Background — cycle the preview host backdrop (dots/grid/solid/transparent + custom color) */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "bgt";                 // short prefix of "bg-toggle"
      var STORE_MODE = "bgToggle.mode"; // persisted background mode
      var STORE_COLOR = "bgToggle.color"; // persisted custom color

      // Ordered cycle. `custom` is reached only via the color picker.
      var MODES = [
        { id: "dots", label: "Dots" },
        { id: "grid", label: "Grid" },
        { id: "solid", label: "Solid" },
        { id: "transparent", label: "Transparent" },
      ];

      // ---- scoped, theme-aware CSS on the preview host ----
      // Checkerboard uses neutral greys (a transparency convention, not a
      // themable surface) so it reads the same in light/dark. Everything
      // else derives from theme vars.
      MS.injectCSS(
        "" +
        "#previewHost.bgt-dots{" +
        "  background-color:var(--surface);" +
        "  background-image:radial-gradient(var(--border) 1.2px,transparent 1.2px);" +
        "  background-size:18px 18px;background-position:0 0;" +
        "}" +
        "#previewHost.bgt-grid{" +
        "  background-color:var(--surface);" +
        "  background-image:" +
        "    linear-gradient(to right,var(--border) 1px,transparent 1px)," +
        "    linear-gradient(to bottom,var(--border) 1px,transparent 1px);" +
        "  background-size:22px 22px;background-position:0 0;" +
        "}" +
        "#previewHost.bgt-solid{" +
        "  background-color:var(--surface);background-image:none;" +
        "}" +
        "#previewHost.bgt-transparent{" +
        "  background-color:#fff;" +
        "  background-image:" +
        "    linear-gradient(45deg,#c9c9c9 25%,transparent 25%)," +
        "    linear-gradient(-45deg,#c9c9c9 25%,transparent 25%)," +
        "    linear-gradient(45deg,transparent 75%,#c9c9c9 75%)," +
        "    linear-gradient(-45deg,transparent 75%,#c9c9c9 75%);" +
        "  background-size:20px 20px;" +
        "  background-position:0 0,0 10px,10px -10px,-10px 0;" +
        "}" +
        "#previewHost.bgt-custom{background-image:none;}" +
        ".bgt-field{display:flex;align-items:center;gap:6px;}" +
        ".bgt-color{" +
        "  width:26px;height:22px;padding:0;border:1px solid var(--border);" +
        "  border-radius:var(--radius);background:var(--surface);cursor:pointer;" +
        "}",
        "bgt-css"
      );

      var host = MS.el("previewHost");
      if (!host) {
        console.error("[bgt] #previewHost not found; feature inactive.");
        return;
      }

      var MODE_IDS = MODES.map(function (m) { return m.id; });
      var ALL_CLASSES = MODE_IDS.map(function (id) { return "bgt-" + id; });
      ALL_CLASSES.push("bgt-custom");

      var mode = MS.get(STORE_MODE, "dots");
      var customColor = MS.get(STORE_COLOR, "#1e293b");
      if (MODE_IDS.indexOf(mode) === -1 && mode !== "custom") mode = "dots";

      function apply() {
        try {
          ALL_CLASSES.forEach(function (c) { host.classList.remove(c); });
          if (mode === "custom") {
            host.classList.add("bgt-custom");
            host.style.backgroundColor = customColor;
          } else {
            host.classList.add("bgt-" + mode);
            host.style.backgroundColor = "";
          }
        } catch (e) {
          console.error("[bgt] apply failed", e);
        }
      }

      function persist() {
        try {
          MS.set(STORE_MODE, mode);
          MS.set(STORE_COLOR, customColor);
        } catch (e) {
          console.error("[bgt] persist failed", e);
        }
      }

      function label() {
        if (mode === "custom") return "Custom";
        var m = MODES.filter(function (x) { return x.id === mode; })[0];
        return m ? m.label : "Dots";
      }

      // ---- color input lives inside the preview toolbar chip area ----
      var colorInput = null;
      function syncColorInput() {
        if (colorInput) {
          try { colorInput.value = customColor; } catch (e) {}
        }
      }

      function cycle() {
        try {
          // Cycling always lands on one of the 4 named modes. If currently
          // custom, restart the cycle at the first mode.
          var idx = MODE_IDS.indexOf(mode);
          idx = (idx + 1) % MODE_IDS.length; // -1 -> 0 for custom
          mode = MODE_IDS[idx];
          apply();
          persist();
          if (btn) btn.title = "Preview background: " + label() + " (click to cycle)";
          MS.toast("Background: " + label());
        } catch (e) {
          console.error("[bgt] cycle failed", e);
        }
      }

      var btn = MS.addPreviewButton({
        id: "bgtBtn",
        title: "Preview background (click to cycle)",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/></svg>',
        onClick: cycle,
      });

      // Add a color picker chip next to the button (native <input type=color>).
      try {
        colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.id = "bgtColor";
        colorInput.className = "bgt-color";
        colorInput.title = "Custom background color";
        colorInput.value = customColor;
        colorInput.addEventListener("input", function () {
          try {
            customColor = colorInput.value;
            mode = "custom";
            apply();
            persist();
            if (btn) btn.title = "Preview background: Custom (click to cycle)";
          } catch (e) {
            console.error("[bgt] color input failed", e);
          }
        });
        if (btn && btn.parentNode) {
          btn.parentNode.insertBefore(colorInput, btn.nextSibling);
        }
      } catch (e) {
        console.error("[bgt] color picker setup failed", e);
      }

      // ---- command palette entry ----
      MS.registerCommand({
        id: "bgt.cycle",
        title: "Preview: Cycle background",
        run: cycle,
      });

      // Initial state.
      apply();
      syncColorInput();
      if (btn) btn.title = "Preview background: " + label() + " (click to cycle)";
    } catch (e) {
      console.error("[bgt] failed to initialize Preview Background feature", e);
    }
  });
})();
