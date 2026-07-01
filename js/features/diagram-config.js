/* Feature: Diagram Config Panel — edit mermaid themeVariables + flowchart curve via a modal */
/* No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var SLUG = "diagram-config";
    var STORE_KEY = "diagram-config.values";

    // Defaults used for first load and for the Reset button.
    var DEFAULTS = {
      primaryColor: "#4f8cff",
      primaryTextColor: "#0b1020",
      lineColor: "#8892a6",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "16px",
      curve: "basis"
    };

    var FIELDS = [
      { key: "primaryColor", label: "Primary color", type: "color" },
      { key: "primaryTextColor", label: "Primary text color", type: "color" },
      { key: "lineColor", label: "Line color", type: "color" },
      { key: "fontFamily", label: "Font family", type: "text" },
      { key: "fontSize", label: "Font size", type: "text" }
    ];

    var CURVES = ["basis", "linear", "step", "cardinal"];

    try {
      MS.injectCSS(
        "" +
        ".dcfg-grid{display:grid;gap:12px;}" +
        ".dcfg-field{display:flex;flex-direction:column;gap:6px;}" +
        ".dcfg-field label{font-size:12px;font-weight:600;color:var(--text);opacity:.85;}" +
        ".dcfg-color-row{display:flex;gap:8px;align-items:center;}" +
        ".dcfg-swatch{width:38px;height:34px;padding:2px;border:1px solid var(--border);" +
        "border-radius:var(--radius);background:var(--surface);cursor:pointer;flex:0 0 auto;}" +
        ".dcfg-color-row .ms-input{flex:1 1 auto;}" +
        ".dcfg-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;" +
        "padding-top:14px;border-top:1px solid var(--border);}" +
        ".dcfg-note{font-size:12px;color:var(--text);opacity:.7;margin:0 0 12px;}",
        SLUG + "-css"
      );
    } catch (e) {
      console.error("[" + SLUG + "] injectCSS failed", e);
    }

    function loadValues() {
      try {
        var saved = MS.get(STORE_KEY, null);
        if (saved && typeof saved === "object") {
          return Object.assign({}, DEFAULTS, saved);
        }
      } catch (e) {
        console.error("[" + SLUG + "] loadValues failed", e);
      }
      return Object.assign({}, DEFAULTS);
    }

    // Apply the given config to the live mermaid instance and rerender.
    function applyConfig(vals) {
      try {
        var m = MS.MERMAID;
        if (!m || typeof m.initialize !== "function") {
          MS.toast("Mermaid is not available");
          return false;
        }
        m.initialize({
          theme: "base",
          themeVariables: {
            primaryColor: vals.primaryColor,
            primaryTextColor: vals.primaryTextColor,
            lineColor: vals.lineColor,
            fontFamily: vals.fontFamily,
            fontSize: vals.fontSize
          },
          flowchart: { curve: vals.curve }
        });
        MS.rerender();
        return true;
      } catch (e) {
        console.error("[" + SLUG + "] applyConfig failed", e);
        MS.toast("Config apply failed");
        return false;
      }
    }

    function saveValues(vals) {
      try {
        MS.set(STORE_KEY, vals);
      } catch (e) {
        console.error("[" + SLUG + "] saveValues failed", e);
      }
    }

    function buildForm(vals) {
      var wrap = document.createElement("div");

      var note = document.createElement("p");
      note.className = "dcfg-note";
      note.textContent = "Edit the base theme variables. Apply re-initializes mermaid with theme \"base\".";
      wrap.appendChild(note);

      var grid = document.createElement("div");
      grid.className = "dcfg-grid ms-grid";

      FIELDS.forEach(function (f) {
        var field = document.createElement("div");
        field.className = "dcfg-field ms-field";

        var lbl = document.createElement("label");
        lbl.setAttribute("for", "dcfg-" + f.key);
        lbl.textContent = f.label;
        field.appendChild(lbl);

        var input = document.createElement("input");
        input.type = "text";
        input.className = "ms-input";
        input.id = "dcfg-" + f.key;
        input.value = vals[f.key] != null ? vals[f.key] : "";
        input.setAttribute("data-dcfg-key", f.key);

        if (f.type === "color") {
          var row = document.createElement("div");
          row.className = "dcfg-color-row";
          var swatch = document.createElement("input");
          swatch.type = "color";
          swatch.className = "dcfg-swatch";
          swatch.id = "dcfg-swatch-" + f.key;
          swatch.value = normalizeHex(vals[f.key]);
          swatch.addEventListener("input", function () { input.value = swatch.value; });
          input.addEventListener("input", function () {
            var hx = normalizeHex(input.value);
            if (hx) swatch.value = hx;
          });
          row.appendChild(swatch);
          row.appendChild(input);
          field.appendChild(row);
        } else {
          field.appendChild(input);
        }

        grid.appendChild(field);
      });

      // Flowchart curve select.
      var curveField = document.createElement("div");
      curveField.className = "dcfg-field ms-field";
      var curveLbl = document.createElement("label");
      curveLbl.setAttribute("for", "dcfg-curve");
      curveLbl.textContent = "Flowchart curve";
      var curveSel = document.createElement("select");
      curveSel.className = "ms-select ms-input";
      curveSel.id = "dcfg-curve";
      curveSel.setAttribute("data-dcfg-key", "curve");
      CURVES.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        if (c === vals.curve) opt.selected = true;
        curveSel.appendChild(opt);
      });
      curveField.appendChild(curveLbl);
      curveField.appendChild(curveSel);
      grid.appendChild(curveField);

      wrap.appendChild(grid);
      return wrap;
    }

    // Coerce a value to a 7-char hex for the native color input; fall back to a default.
    function normalizeHex(v) {
      if (typeof v !== "string") return "#000000";
      var s = v.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
      if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
      }
      return "#000000";
    }

    function readForm(body) {
      var vals = {};
      try {
        var nodes = body.querySelectorAll("[data-dcfg-key]");
        Array.prototype.forEach.call(nodes, function (n) {
          vals[n.getAttribute("data-dcfg-key")] = n.value;
        });
      } catch (e) {
        console.error("[" + SLUG + "] readForm failed", e);
      }
      return Object.assign({}, DEFAULTS, vals);
    }

    function openConfig() {
      try {
        var vals = loadValues();
        MS.openModal({
          title: "Diagram Config",
          width: "460px",
          onMount: function (body) {
            var form = buildForm(vals);
            body.appendChild(form);

            var actions = document.createElement("div");
            actions.className = "dcfg-actions ms-btn-row";

            var resetBtn = document.createElement("button");
            resetBtn.className = "ms-btn";
            resetBtn.id = "dcfg-reset";
            resetBtn.type = "button";
            resetBtn.textContent = "Reset";
            resetBtn.addEventListener("click", function () {
              try {
                var fresh = Object.assign({}, DEFAULTS);
                saveValues(fresh);
                applyConfig(fresh);
                MS.closeModal();
                openConfig();
                MS.toast("Config reset to defaults");
              } catch (e) {
                console.error("[" + SLUG + "] reset failed", e);
              }
            });

            var applyBtn = document.createElement("button");
            applyBtn.className = "ms-btn ms-btn--primary";
            applyBtn.id = "dcfg-apply";
            applyBtn.type = "button";
            applyBtn.textContent = "Apply";
            applyBtn.addEventListener("click", function () {
              try {
                var next = readForm(body);
                if (applyConfig(next)) {
                  saveValues(next);
                  MS.toast("Config applied");
                  MS.closeModal();
                }
              } catch (e) {
                console.error("[" + SLUG + "] apply failed", e);
              }
            });

            actions.appendChild(resetBtn);
            actions.appendChild(applyBtn);
            body.appendChild(actions);
          }
        });
      } catch (e) {
        console.error("[" + SLUG + "] openConfig failed", e);
        MS.toast("Could not open config");
      }
    }

    try {
      MS.addTopbarButton({
        id: "dcfgBtn",
        label: "Config",
        title: "Diagram config (theme variables & curve)",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        onClick: openConfig
      });
    } catch (e) {
      console.error("[" + SLUG + "] addTopbarButton failed", e);
    }

    try {
      MS.registerCommand({
        id: SLUG + ".open",
        title: "Diagram Config: Open panel",
        run: openConfig
      });
    } catch (e) {
      console.error("[" + SLUG + "] registerCommand failed", e);
    }
  });
})();
