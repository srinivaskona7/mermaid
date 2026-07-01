/* Feature: Presentation Mode — distraction-free full-screen preview.
   Hides topbar/editor/statusbar via a body class, centers the diagram on a
   clean surface, fits it, and lets you flip between documents with the arrow
   keys. Esc or the floating Exit button leaves. No external CDN libs. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var BODY_CLASS = "present-mode-on";
      var active = false;
      var keyHandler = null;
      var exitBtn = null;

      MS.injectCSS(
        [
          /* When active, blank out the chrome and keep only the preview. */
          "body." + BODY_CLASS + " .topbar,",
          "body." + BODY_CLASS + " .statusbar,",
          "body." + BODY_CLASS + " #editorPane,",
          "body." + BODY_CLASS + " #resizer{",
          "  display:none !important;",
          "}",
          "body." + BODY_CLASS + " #previewPane{",
          "  width:100% !important;",
          "}",
          "body." + BODY_CLASS + " #previewPane .pane__head,",
          "body." + BODY_CLASS + " #previewPane .pane__titlebar,",
          "body." + BODY_CLASS + " #previewPane .pane__tools,",
          "body." + BODY_CLASS + " #previewPane .pane__toolbar{",
          "  display:none !important;",
          "}",
          "body." + BODY_CLASS + " #previewHost,",
          "body." + BODY_CLASS + " #previewCanvas{",
          "  background:var(--surface) !important;",
          "}",
          "body." + BODY_CLASS + " #previewCanvas{",
          "  display:flex; align-items:center; justify-content:center;",
          "}",
          /* Floating exit control, anchored to the viewport. */
          "#present-mode-exit{",
          "  position:fixed; top:16px; right:16px; z-index:9999;",
          "  display:none; align-items:center; gap:6px;",
          "  background:var(--surface); color:var(--text);",
          "  border:1px solid var(--border); border-radius:var(--radius);",
          "  padding:8px 12px; cursor:pointer;",
          "  box-shadow:0 4px 16px rgba(0,0,0,.22);",
          "  opacity:.55; transition:opacity .15s ease;",
          "}",
          "#present-mode-exit:hover,#present-mode-exit:focus{",
          "  opacity:1; border-color:var(--accent); color:var(--accent);",
          "  outline:none;",
          "}",
          "#present-mode-exit .present-mode-hint{",
          "  font:11px/1 system-ui,sans-serif; opacity:.7;",
          "}",
          "body." + BODY_CLASS + " #present-mode-exit{ display:inline-flex; }",
        ].join("\n"),
        "present-mode-css"
      );

      // --- floating Exit button (created once, shown via body class) ---
      try {
        exitBtn = document.createElement("button");
        exitBtn.id = "present-mode-exit";
        exitBtn.type = "button";
        exitBtn.title = "Exit presentation (Esc)";
        exitBtn.setAttribute("aria-label", "Exit presentation mode");
        exitBtn.innerHTML =
          '<svg viewBox="0 0 24 24" class="ico" width="16" height="16" ' +
          'fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          "<span>Exit</span><span class=\"present-mode-hint\">Esc</span>";
        exitBtn.addEventListener("click", function () {
          exit();
        });
        document.body.appendChild(exitBtn);
      } catch (e) {
        console.error("[present-mode] build exit button", e);
      }

      function fitDiagram() {
        try {
          var pz = MS.getPanZoom();
          if (pz) {
            if (typeof pz.resize === "function") pz.resize();
            if (typeof pz.fit === "function") pz.fit();
            if (typeof pz.center === "function") pz.center();
          }
        } catch (e) {
          console.error("[present-mode] fit", e);
        }
      }

      function stepDoc(dir) {
        try {
          var docs = MS.getDocs();
          if (!docs || docs.length < 2) return;
          var current = MS.getActiveDoc();
          var idx = -1;
          for (var i = 0; i < docs.length; i++) {
            if (current && docs[i] && docs[i].id === current.id) {
              idx = i;
              break;
            }
          }
          if (idx === -1) idx = 0;
          var next = (idx + dir + docs.length) % docs.length;
          var target = docs[next];
          if (target && typeof target.id !== "undefined") {
            MS.switchDoc(target.id);
          }
        } catch (e) {
          console.error("[present-mode] stepDoc", e);
        }
      }

      function onKey(e) {
        try {
          if (!active) return;
          if (e.key === "Escape") {
            e.preventDefault();
            exit();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            stepDoc(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            stepDoc(-1);
          }
        } catch (err) {
          console.error("[present-mode] onKey", err);
        }
      }

      function enter() {
        if (active) return;
        try {
          active = true;
          document.body.classList.add(BODY_CLASS);
          keyHandler = onKey;
          // Capture phase so we win over the app's own Escape handling.
          document.addEventListener("keydown", keyHandler, true);
          // Let layout settle before fitting the diagram.
          setTimeout(fitDiagram, 60);
          if (exitBtn && typeof exitBtn.focus === "function") {
            try {
              exitBtn.focus();
            } catch (e) {
              /* focus is best-effort */
            }
          }
        } catch (e) {
          console.error("[present-mode] enter", e);
        }
      }

      function exit() {
        if (!active) return;
        try {
          active = false;
          document.body.classList.remove(BODY_CLASS);
          if (keyHandler) {
            document.removeEventListener("keydown", keyHandler, true);
            keyHandler = null;
          }
          // Re-fit into the restored (smaller) preview pane.
          setTimeout(fitDiagram, 60);
        } catch (e) {
          console.error("[present-mode] exit", e);
        }
      }

      function toggle() {
        if (active) exit();
        else enter();
      }

      // Re-fit when the diagram re-renders while presenting (e.g. doc switch).
      try {
        MS.on("render", function () {
          if (active) setTimeout(fitDiagram, 40);
        });
      } catch (e) {
        console.error("[present-mode] on render", e);
      }

      // --- topbar button ---
      try {
        MS.addTopbarButton({
          id: "present-mode-btn",
          label: "Present",
          title: "Enter presentation mode",
          icon:
            '<svg viewBox="0 0 24 24" class="ico" width="16" height="16" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="2" y="3" width="20" height="14" rx="2"/>' +
            '<line x1="8" y1="21" x2="16" y2="21"/>' +
            '<line x1="12" y1="17" x2="12" y2="21"/></svg>',
          onClick: enter,
        });
      } catch (e) {
        console.error("[present-mode] addTopbarButton", e);
      }

      // --- command palette entry ---
      try {
        MS.registerCommand({
          id: "present-mode.toggle",
          title: "Presentation Mode: Toggle",
          run: toggle,
        });
      } catch (e) {
        console.error("[present-mode] registerCommand", e);
      }
    } catch (e) {
      console.error("[present-mode] init", e);
    }
  });
})();
