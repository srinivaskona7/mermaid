/* Feature: Embed Code Generator — produce copy-paste embed snippets for the
   current diagram. Offers (1) an <iframe> pointing at MS.makeShareLink() and
   (2) a self-contained inline HTML snippet (<pre class="mermaid"> + mermaid CDN
   <script> + mermaid.initialize).
   No external CDN library is loaded by this module itself. The inline snippet it
   GENERATES references the public mermaid CDN as text for the user to paste. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var SLUG = "embed-code";
    // mermaid CDN referenced (as text) inside the generated inline snippet.
    var MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

    try {
      MS.injectCSS(
        [
          ".emb-btn .ico { width: 16px; height: 16px; }",
          ".emb-field { margin-top: 4px; }",
          ".emb-field + .emb-field { margin-top: 16px; }",
          ".emb-head {",
          "  display: flex;",
          "  align-items: center;",
          "  justify-content: space-between;",
          "  gap: 8px;",
          "  margin-bottom: 6px;",
          "}",
          ".emb-title {",
          "  font-weight: 600;",
          "  color: var(--text);",
          "  font-size: 13px;",
          "}",
          ".emb-textarea {",
          "  width: 100%;",
          "  box-sizing: border-box;",
          "  min-height: 96px;",
          "  resize: vertical;",
          "  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;",
          "  font-size: 12px;",
          "  line-height: 1.5;",
          "  color: var(--text);",
          "  background: var(--surface);",
          "  border: 1px solid var(--border);",
          "  border-radius: var(--radius);",
          "  padding: 8px 10px;",
          "  white-space: pre;",
          "  overflow: auto;",
          "}",
          ".emb-desc {",
          "  margin: 4px 0 0;",
          "  color: var(--text);",
          "  opacity: 0.7;",
          "  font-size: 11px;",
          "  line-height: 1.4;",
          "}",
        ].join("\n"),
        "embed-code-css"
      );
    } catch (e) {
      console.error("[" + SLUG + "] injectCSS failed", e);
    }

    // Escape a string for safe embedding as HTML text content.
    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // Build the <iframe> snippet pointing at the share link.
    function buildIframe(shareLink) {
      var src = esc(shareLink);
      return [
        '<iframe',
        '  src="' + src + '"',
        '  title="Mermaid diagram"',
        '  width="800"',
        '  height="600"',
        '  style="border:0;max-width:100%"',
        '  loading="lazy">',
        "</iframe>",
      ].join("\n");
    }

    // Build a self-contained inline HTML snippet. The mermaid source code is
    // escaped so it survives inside a <pre> and can't break out of the markup.
    function buildInline(code) {
      var safeCode = esc(code || "");
      return [
        '<pre class="mermaid">',
        safeCode,
        "</pre>",
        '<script type="module">',
        "  import mermaid from " + JSON.stringify(MERMAID_CDN.replace(/\.min\.js$/, ".esm.min.mjs")) + ";",
        "  mermaid.initialize({ startOnLoad: true });",
        "<\/script>",
      ].join("\n");
    }

    // Fallback inline snippet using a classic <script> tag (non-module),
    // kept as an alternative comment inside the module for clarity. The
    // primary generated snippet above uses the ESM entry which is the
    // recommended mermaid v11 usage.

    // Wire a labelled read-only textarea with a Copy button into the modal body.
    function addSnippet(body, opts) {
      var field = document.createElement("div");
      field.className = "emb-field";

      var head = document.createElement("div");
      head.className = "emb-head";

      var title = document.createElement("span");
      title.className = "emb-title";
      title.textContent = opts.title;

      var copyBtn = document.createElement("button");
      copyBtn.className = "ms-btn";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";

      var ta = document.createElement("textarea");
      ta.className = "emb-textarea";
      ta.readOnly = true;
      ta.spellcheck = false;
      ta.setAttribute("wrap", "off");
      ta.value = opts.value;

      copyBtn.addEventListener("click", function () {
        try {
          ta.focus();
          ta.select();
          var done = function () {
            copyBtn.textContent = "Copied";
            MS.toast(opts.title + " copied");
            setTimeout(function () { copyBtn.textContent = "Copy"; }, 1400);
          };
          var p = MS.copyText(ta.value);
          if (p && typeof p.then === "function") {
            p.then(done, function (err) {
              console.error("[" + SLUG + "] copyText failed", err);
              MS.toast("Copy failed — select the text and copy manually");
            });
          } else {
            done();
          }
        } catch (e) {
          console.error("[" + SLUG + "] copy failed", e);
          MS.toast("Copy failed — select the text and copy manually");
        }
      });

      head.appendChild(title);
      head.appendChild(copyBtn);
      field.appendChild(head);
      field.appendChild(ta);

      if (opts.desc) {
        var desc = document.createElement("p");
        desc.className = "emb-desc";
        desc.textContent = opts.desc;
        field.appendChild(desc);
      }

      body.appendChild(field);
    }

    // Open the Embed modal with both snippets.
    function openDialog() {
      try {
        var code = "";
        try {
          code = MS.getCode() || "";
        } catch (e) {
          console.error("[" + SLUG + "] getCode failed", e);
        }

        var shareLink = "";
        try {
          shareLink = MS.makeShareLink() || "";
        } catch (e) {
          console.error("[" + SLUG + "] makeShareLink failed", e);
        }

        MS.openModal({
          title: "Embed diagram",
          width: "560px",
          onMount: function (body) {
            try {
              addSnippet(body, {
                title: "iframe embed",
                value: buildIframe(shareLink),
                desc: "Embeds a live copy of this diagram via a shareable link. Paste into any HTML page.",
              });

              addSnippet(body, {
                title: "Inline HTML (self-contained)",
                value: buildInline(code),
                desc: "Renders the diagram client-side using the mermaid CDN. No link dependency.",
              });
            } catch (e) {
              console.error("[" + SLUG + "] mount failed", e);
              MS.toast("Could not build embed snippets");
            }
          },
        });
      } catch (e) {
        console.error("[" + SLUG + "] openDialog failed", e);
        MS.toast("Embed failed: " + (e && e.message ? e.message : e));
      }
    }

    try {
      MS.addTopbarButton({
        id: "embedBtn",
        title: "Embed diagram (iframe / inline HTML)",
        icon:
          '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        onClick: openDialog,
      });
    } catch (e) {
      console.error("[" + SLUG + "] addTopbarButton failed", e);
    }

    try {
      MS.registerCommand({
        id: "embed-code.run",
        title: "Embed: Copy embed code",
        run: openDialog,
      });
    } catch (e) {
      console.error("[" + SLUG + "] registerCommand failed", e);
    }
  });
})();
