/* Feature: App Theme Editor — preset + custom app themes via CSS custom properties on :root.
   No external CDN libraries used. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "theme-editor";
      var STORE_KEY = "themeed-selection";

      // Themable CSS custom properties (matches the app's design tokens).
      var VARS = ["--bg", "--surface", "--accent", "--accent-2", "--text", "--border"];

      // Preset app themes. Values are hex only because they are the *source* values
      // written into CSS custom properties; the UI itself is styled with the vars.
      var PRESETS = {
        Default: null, // null => clear overrides, fall back to stylesheet defaults
        Ocean: {
          "--bg": "#0b1a2b", "--surface": "#0f2540", "--accent": "#38bdf8",
          "--accent-2": "#22d3ee", "--text": "#e2f0ff", "--border": "#1e3a5f"
        },
        Sunset: {
          "--bg": "#2a1220", "--surface": "#3d1a2b", "--accent": "#fb7185",
          "--accent-2": "#fbbf24", "--text": "#ffe4ec", "--border": "#5a2740"
        },
        Mono: {
          "--bg": "#111111", "--surface": "#1c1c1c", "--accent": "#e5e5e5",
          "--accent-2": "#9ca3af", "--text": "#f5f5f5", "--border": "#333333"
        },
        Forest: {
          "--bg": "#0c1f14", "--surface": "#12301f", "--accent": "#34d399",
          "--accent-2": "#a3e635", "--text": "#e3f7ea", "--border": "#1f4d33"
        }
      };
      var PRESET_NAMES = ["Default", "Ocean", "Sunset", "Mono", "Forest"];
      // Custom-picker subset of vars.
      var CUSTOM_VARS = ["--accent", "--bg", "--surface"];

      // ---------- State helpers ----------
      function defaultState() {
        return { preset: "Default", custom: {} };
      }
      function loadState() {
        try {
          var s = MS.get(STORE_KEY, null);
          if (!s || typeof s !== "object") return defaultState();
          return {
            preset: typeof s.preset === "string" ? s.preset : "Default",
            custom: (s.custom && typeof s.custom === "object") ? s.custom : {}
          };
        } catch (e) {
          console.error("[" + SLUG + "] loadState failed", e);
          return defaultState();
        }
      }
      function saveState(state) {
        try { MS.set(STORE_KEY, state); } catch (e) { console.error("[" + SLUG + "] saveState failed", e); }
      }

      // ---------- Apply / clear ----------
      function clearOverrides() {
        try {
          var root = document.documentElement;
          VARS.forEach(function (v) { root.style.removeProperty(v); });
        } catch (e) { console.error("[" + SLUG + "] clearOverrides failed", e); }
      }
      function applyState(state) {
        try {
          clearOverrides();
          var root = document.documentElement;
          var preset = PRESETS[state.preset];
          if (preset) {
            VARS.forEach(function (v) {
              if (preset[v]) root.style.setProperty(v, preset[v]);
            });
          }
          // Custom values override the preset.
          if (state.custom) {
            CUSTOM_VARS.forEach(function (v) {
              var val = state.custom[v];
              if (typeof val === "string" && val) root.style.setProperty(v, val);
            });
          }
        } catch (e) { console.error("[" + SLUG + "] applyState failed", e); }
      }

      // Resolve the currently effective value of a var (custom > preset > computed).
      function effectiveValue(state, v) {
        try {
          if (state.custom && state.custom[v]) return state.custom[v];
          var preset = PRESETS[state.preset];
          if (preset && preset[v]) return preset[v];
          var comp = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
          return normalizeHex(comp) || "#000000";
        } catch (e) {
          console.error("[" + SLUG + "] effectiveValue failed", e);
          return "#000000";
        }
      }

      // <input type=color> only accepts #rrggbb. Best-effort normalize.
      function normalizeHex(c) {
        if (!c) return "";
        c = c.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(c)) return c.toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(c)) {
          return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
        }
        return "";
      }

      // ---------- Styles (theme-var driven) ----------
      MS.injectCSS(
        ".themeed-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:16px}" +
        ".themeed-swatch{cursor:pointer;border:2px solid var(--border);border-radius:var(--radius,8px);" +
          "padding:10px;background:var(--surface);color:var(--text);text-align:left;font:inherit;transition:border-color .12s}" +
        ".themeed-swatch:hover{border-color:var(--accent)}" +
        ".themeed-swatch.is-active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}" +
        ".themeed-swatch__name{font-weight:600;font-size:13px;margin-bottom:8px}" +
        ".themeed-chips{display:flex;gap:5px}" +
        ".themeed-chip{width:100%;height:18px;border-radius:4px;border:1px solid var(--border)}" +
        ".themeed-custom{border-top:1px solid var(--border);padding-top:14px}" +
        ".themeed-custom__title{font-weight:600;font-size:13px;margin:0 0 10px;color:var(--text)}" +
        ".themeed-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}" +
        ".themeed-row label{flex:1;color:var(--text);font-size:13px}" +
        ".themeed-color{width:44px;height:30px;padding:0;border:1px solid var(--border);border-radius:var(--radius,8px);background:var(--surface);cursor:pointer}" +
        ".themeed-actions{display:flex;gap:8px;margin-top:6px}",
        "theme-editor-css"
      );

      // ---------- Modal builder ----------
      function buildModal() {
        var state = loadState();
        var wrap = document.createElement("div");

        // Preset grid
        var grid = document.createElement("div");
        grid.className = "themeed-grid ms-grid";
        PRESET_NAMES.forEach(function (name) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "themeed-swatch" + (state.preset === name ? " is-active" : "");
          btn.dataset.themeedPreset = name;

          var label = document.createElement("div");
          label.className = "themeed-swatch__name";
          label.textContent = name;
          btn.appendChild(label);

          var chips = document.createElement("div");
          chips.className = "themeed-chips";
          var p = PRESETS[name];
          ["--accent", "--accent-2", "--surface", "--bg"].forEach(function (v) {
            var chip = document.createElement("span");
            chip.className = "themeed-chip";
            if (p && p[v]) chip.style.background = p[v];
            else chip.style.background = "var(" + v + ")";
            chips.appendChild(chip);
          });
          btn.appendChild(chips);

          btn.addEventListener("click", function () {
            try {
              state.preset = name;
              // Selecting a preset resets custom overrides so it applies cleanly.
              state.custom = {};
              applyState(state);
              saveState(state);
              refreshUI();
              MS.toast("Theme: " + name);
            } catch (e) { console.error("[" + SLUG + "] preset click failed", e); }
          });
          grid.appendChild(btn);
        });
        wrap.appendChild(grid);

        // Custom pickers
        var custom = document.createElement("div");
        custom.className = "themeed-custom";
        var ctitle = document.createElement("p");
        ctitle.className = "themeed-custom__title";
        ctitle.textContent = "Customize";
        custom.appendChild(ctitle);

        var LABELS = { "--accent": "Accent", "--bg": "Background", "--surface": "Surface" };
        var pickers = {};
        CUSTOM_VARS.forEach(function (v) {
          var row = document.createElement("div");
          row.className = "themeed-row ms-field";
          var lab = document.createElement("label");
          lab.textContent = LABELS[v] || v;
          lab.setAttribute("for", "themeed-color-" + v.replace(/[^a-z0-9]/gi, ""));
          var input = document.createElement("input");
          input.type = "color";
          input.className = "themeed-color";
          input.id = "themeed-color-" + v.replace(/[^a-z0-9]/gi, "");
          input.value = effectiveValue(state, v);
          input.addEventListener("input", function () {
            try {
              state.custom[v] = input.value;
              applyState(state);
              saveState(state);
              // A custom edit no longer matches a bare preset selection visually,
              // but we keep preset as the base; just update active highlighting off.
              refreshActiveSwatches();
            } catch (e) { console.error("[" + SLUG + "] color input failed", e); }
          });
          pickers[v] = input;
          row.appendChild(lab);
          row.appendChild(input);
          custom.appendChild(row);
        });

        // Reset action
        var actions = document.createElement("div");
        actions.className = "themeed-actions ms-btn-row";
        var resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "ms-btn";
        resetBtn.textContent = "Reset to Default";
        resetBtn.addEventListener("click", function () {
          try {
            state.preset = "Default";
            state.custom = {};
            applyState(state);
            saveState(state);
            refreshUI();
            MS.toast("Theme reset");
          } catch (e) { console.error("[" + SLUG + "] reset failed", e); }
        });
        actions.appendChild(resetBtn);
        custom.appendChild(actions);
        wrap.appendChild(custom);

        function refreshActiveSwatches() {
          try {
            var swatches = grid.querySelectorAll(".themeed-swatch");
            swatches.forEach(function (s) {
              s.classList.toggle("is-active", s.dataset.themeedPreset === state.preset);
            });
          } catch (e) { console.error("[" + SLUG + "] refreshActiveSwatches failed", e); }
        }
        function refreshUI() {
          refreshActiveSwatches();
          try {
            CUSTOM_VARS.forEach(function (v) {
              if (pickers[v]) pickers[v].value = effectiveValue(state, v);
            });
          } catch (e) { console.error("[" + SLUG + "] refreshUI failed", e); }
        }

        return wrap;
      }

      function openThemeEditor() {
        try {
          MS.openModal({
            title: "App Themes",
            width: "480px",
            node: buildModal()
          });
        } catch (e) { console.error("[" + SLUG + "] openThemeEditor failed", e); }
      }

      // ---------- Topbar button ----------
      MS.addTopbarButton({
        id: "themeedBtn",
        label: "Themes",
        title: "App theme editor",
        icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.5 0-1-1-1.5-1-2.5s.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-5-4.5-8.5-10-8.5z"/></svg>',
        onClick: openThemeEditor
      });

      // ---------- Command palette ----------
      MS.registerCommand({
        id: "theme-editor.open",
        title: "App Theme: Open editor",
        run: openThemeEditor
      });

      // ---------- Apply persisted selection on load ----------
      applyState(loadState());
    } catch (e) {
      console.error("[theme-editor] init failed", e);
    }
  });
})();
