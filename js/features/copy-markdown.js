/* Feature: Copy as Markdown — copies the current code as a fenced ```mermaid block */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        `
        .copymd-chip { color: var(--text); }
        .copymd-chip:hover { color: var(--accent); }
        `,
        "copy-markdown-css"
      );

      function copyMarkdown() {
        try {
          var code = (MS.getCode() || "").replace(/\s+$/, "");
          var md = "```mermaid\n" + code + "\n```";
          var p = MS.copyText(md);
          if (p && typeof p.then === "function") {
            p.then(
              function () { MS.toast("Copied Markdown"); },
              function (err) {
                console.error("[copy-markdown] clipboard failed", err);
                MS.toast("Copy failed");
              }
            );
          } else {
            MS.toast("Copied Markdown");
          }
        } catch (err) {
          console.error("[copy-markdown] copy failed", err);
          try { MS.toast("Copy failed"); } catch (e) {}
        }
      }

      MS.addEditorButton({
        id: "copymdBtn",
        label: "MD",
        title: "Copy as Markdown (fenced mermaid block)",
        icon:
          '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"/><path d="M8 4h8v4H8z"/></svg>',
        onClick: copyMarkdown,
      });

      MS.registerCommand({
        id: "copy-markdown.copy",
        title: "Copy as Markdown",
        run: copyMarkdown,
      });
    } catch (err) {
      console.error("[copy-markdown] init failed", err);
    }
  });
})();
