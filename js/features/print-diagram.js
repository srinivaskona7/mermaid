/* Feature: Print Diagram — adds a preview "Print" button that opens a print
   window containing only the serialized SVG, centered and scaled to the page
   on a white background, then triggers window.print(). No external CDN. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        [
          ".print-diagram-btn .ico { width: 16px; height: 16px; }",
          /* Themed hint styling for the fallback modal (theme-aware). */
          ".print-diagram-note {",
          "  color: var(--text);",
          "  background: var(--surface);",
          "  border: 1px solid var(--border);",
          "  border-radius: var(--radius);",
          "  padding: 12px 14px;",
          "  line-height: 1.5;",
          "}",
          ".print-diagram-note a { color: var(--accent); }",
        ].join("\n"),
        "print-diagram-css"
      );
    } catch (e) {
      console.error("[print-diagram] injectCSS failed", e);
    }

    // Build the standalone HTML document that the print window will contain.
    // Only the serialized SVG is included, centered + scaled, white background.
    function buildPrintDoc(svgString, title) {
      var safeTitle = String(title || "Diagram").replace(/[<>&]/g, function (c) {
        return c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;";
      });
      return [
        "<!DOCTYPE html>",
        '<html><head><meta charset="utf-8">',
        "<title>" + safeTitle + "</title>",
        "<style>",
        "  html, body { margin: 0; padding: 0; background: #ffffff; }",
        "  .print-diagram-wrap {",
        "    box-sizing: border-box;",
        "    width: 100%;",
        "    min-height: 100vh;",
        "    display: flex;",
        "    align-items: center;",
        "    justify-content: center;",
        "    padding: 24px;",
        "    background: #ffffff;",
        "  }",
        "  .print-diagram-wrap svg {",
        "    max-width: 100%;",
        "    max-height: 100vh;",
        "    height: auto;",
        "    width: auto;",
        "  }",
        "  @page { margin: 12mm; }",
        "  @media print {",
        "    html, body, .print-diagram-wrap { background: #ffffff; }",
        "  }",
        "</style></head>",
        '<body><div class="print-diagram-wrap">',
        svgString,
        "</div></body></html>",
      ].join("\n");
    }

    function printDiagram() {
      try {
        var svgString = MS.getSvgString();
        if (!svgString) {
          MS.toast("Nothing to print — render a diagram first");
          return;
        }

        var doc;
        try {
          doc = MS.getActiveDoc();
        } catch (e) {
          doc = null;
        }
        var title = (doc && doc.title) || "Diagram";
        var html = buildPrintDoc(svgString, title);

        var win = window.open("", "print-diagram-window");
        if (!win) {
          // Popup blocked — fall back to a modal explaining what happened.
          try {
            MS.openModal({
              title: "Print blocked",
              width: "420px",
              html:
                '<div class="print-diagram-note">The print window was blocked ' +
                "by the browser. Allow pop-ups for this site, then click " +
                "<strong>Print</strong> again.</div>",
            });
          } catch (e2) {
            MS.toast("Enable pop-ups to print");
          }
          return;
        }

        win.document.open();
        win.document.write(html);
        win.document.close();

        // Wait for the new document (and its SVG) to be ready before printing.
        var printed = false;
        var doPrint = function () {
          if (printed) return;
          printed = true;
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.error("[print-diagram] print failed", e);
            MS.toast("Print failed");
          }
        };

        try {
          win.onload = doPrint;
        } catch (e) {
          console.error("[print-diagram] onload assign failed", e);
        }
        // Fallback timer in case onload has already fired / doesn't fire.
        setTimeout(doPrint, 350);
      } catch (e) {
        console.error("[print-diagram] printDiagram failed", e);
        MS.toast("Print failed");
      }
    }

    try {
      MS.addPreviewButton({
        id: "print-diagram-btn",
        label: "Print",
        title: "Print the diagram",
        icon:
          '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="6 9 6 2 18 2 18 9"/>' +
          '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>' +
          '<rect x="6" y="14" width="12" height="8"/></svg>',
        onClick: printDiagram,
      });
    } catch (e) {
      console.error("[print-diagram] addPreviewButton failed", e);
    }

    try {
      MS.registerCommand({
        id: "print-diagram.print",
        title: "Print Diagram",
        run: printDiagram,
      });
    } catch (e) {
      console.error("[print-diagram] registerCommand failed", e);
    }
  });
})();
