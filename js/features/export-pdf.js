/* Feature: Export to PDF — print the current diagram to a PDF via a new window.
   No external CDN libraries are loaded. Uses the browser's native print dialog
   (window.print) so the user can "Save as PDF". */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var SLUG = "export-pdf";

    try {
      MS.injectCSS(
        [
          ".expdf-btn .ico { width: 16px; height: 16px; }",
          ".expdf-note {",
          "  margin-top: 8px;",
          "  color: var(--text);",
          "  opacity: 0.75;",
          "  font-size: 12px;",
          "  line-height: 1.4;",
          "}",
          ".expdf-row { margin-top: 12px; }",
        ].join("\n"),
        "export-pdf-css"
      );
    } catch (e) {
      console.error("[" + SLUG + "] injectCSS failed", e);
    }

    // Page presets in CSS mm (A4 / US Letter), with 12mm margins baked in.
    var PAGES = {
      a4: { label: "A4", css: "A4" },
      letter: { label: "Letter", css: "letter" },
    };

    // Escape a string for safe embedding inside an HTML attribute/text node.
    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // Build the printable document HTML around the serialized SVG.
    function buildDoc(svgString, title, pageKey) {
      var page = PAGES[pageKey] || PAGES.a4;
      var safeTitle = esc(title || "diagram");
      // The SVG string may include an XML prolog; strip it for HTML embedding.
      var svg = String(svgString || "").replace(/^<\?xml[^>]*\?>\s*/i, "");
      return [
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        "<title>" + safeTitle + "</title>",
        "<style>",
        "  @page { size: " + page.css + "; margin: 12mm; }",
        "  html, body { margin: 0; padding: 0; background: #ffffff; }",
        "  body {",
        "    display: flex;",
        "    align-items: center;",
        "    justify-content: center;",
        "    min-height: 100vh;",
        "    box-sizing: border-box;",
        "  }",
        "  .expdf-page {",
        "    width: 100%;",
        "    text-align: center;",
        "  }",
        "  .expdf-page svg {",
        "    max-width: 100%;",
        "    height: auto;",
        "    display: inline-block;",
        "  }",
        "  @media print { body { min-height: auto; } }",
        "</style>",
        "</head>",
        '<body>',
        '<div class="expdf-page">' + svg + "</div>",
        "<script>",
        "  (function () {",
        "    function go() {",
        "      try { window.focus(); window.print(); } catch (e) {}",
        "    }",
        "    if (document.readyState === 'complete') { setTimeout(go, 150); }",
        "    else { window.addEventListener('load', function () { setTimeout(go, 150); }); }",
        "  })();",
        "<\/script>",
        "</body>",
        "</html>",
      ].join("\n");
    }

    // Open a new window, inject the printable document, trigger print.
    function printPdf(pageKey) {
      try {
        var svgString = MS.getSvgString();
        if (!svgString) {
          MS.toast("Nothing to export — draw a diagram first");
          return;
        }

        var base = "diagram";
        try {
          base = MS.fileBase() || "diagram";
        } catch (e) {
          console.error("[" + SLUG + "] fileBase failed", e);
        }

        var win = window.open("", "_blank");
        if (!win) {
          MS.toast("Popup blocked — allow popups to export PDF");
          return;
        }

        var html = buildDoc(svgString, base, pageKey);
        win.document.open();
        win.document.write(html);
        win.document.close();
        MS.toast("Opening print dialog — choose “Save as PDF”");
      } catch (e) {
        console.error("[" + SLUG + "] printPdf failed", e);
        MS.toast("PDF export failed: " + (e && e.message ? e.message : e));
      }
    }

    // Small modal to pick a page size, then print.
    function openDialog() {
      try {
        MS.openModal({
          title: "Export to PDF",
          width: "360px",
          onMount: function (body) {
            var field = document.createElement("div");
            field.className = "ms-field";

            var label = document.createElement("label");
            label.textContent = "Page size";
            label.setAttribute("for", "expdf-size");

            var select = document.createElement("select");
            select.className = "ms-select";
            select.id = "expdf-size";
            Object.keys(PAGES).forEach(function (key) {
              var opt = document.createElement("option");
              opt.value = key;
              opt.textContent = PAGES[key].label;
              select.appendChild(opt);
            });

            field.appendChild(label);
            field.appendChild(select);

            var note = document.createElement("p");
            note.className = "expdf-note";
            note.textContent =
              "Opens the diagram in a new window and launches the print dialog. Choose “Save as PDF” as the destination.";

            var row = document.createElement("div");
            row.className = "ms-btn-row expdf-row";

            var go = document.createElement("button");
            go.className = "ms-btn ms-btn--primary";
            go.type = "button";
            go.textContent = "Print / Save as PDF";
            go.addEventListener("click", function () {
              var key = select.value;
              try {
                MS.closeModal();
              } catch (e) {
                console.error("[" + SLUG + "] closeModal failed", e);
              }
              printPdf(key);
            });

            row.appendChild(go);
            body.appendChild(field);
            body.appendChild(note);
            body.appendChild(row);
          },
        });
      } catch (e) {
        console.error("[" + SLUG + "] openDialog failed", e);
        // Fall back to a direct A4 print if the modal cannot open.
        printPdf("a4");
      }
    }

    try {
      MS.addPreviewButton({
        id: "expdfBtn",
        label: "PDF",
        title: "Export diagram to PDF (print / Save as PDF)",
        icon:
          '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h9l3 3v4"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/></svg>',
        onClick: openDialog,
      });
    } catch (e) {
      console.error("[" + SLUG + "] addPreviewButton failed", e);
    }

    try {
      MS.registerCommand({
        id: "export-pdf.run",
        title: "Export: Save as PDF",
        run: openDialog,
      });
    } catch (e) {
      console.error("[" + SLUG + "] registerCommand failed", e);
    }
  });
})();
