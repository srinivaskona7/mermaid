/* Feature: Import from URL — fetch Mermaid source from a URL (GitHub blob / gist raw
   rewriting supported) into a new document. No external CDN libraries loaded. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "import-url";

      MS.injectCSS(
        "" +
          "." + SLUG + "-form{display:flex;flex-direction:column;gap:12px;}" +
          "." + SLUG + "-hint{font-size:12px;opacity:.75;line-height:1.5;}" +
          "." + SLUG + "-err{display:none;font-size:13px;line-height:1.5;padding:8px 10px;" +
          "border:1px solid var(--border);border-radius:var(--radius);" +
          "background:var(--surface);color:var(--text);}" +
          "." + SLUG + "-err." + SLUG + "-show{display:block;}" +
          "." + SLUG + "-err strong{color:var(--accent);}",
        "import-url-css"
      );

      // Rewrite common host URLs to raw text endpoints. Returns possibly-rewritten URL.
      function toRawUrl(url) {
        try {
          var u = new URL(url);
          // GitHub blob -> raw.githubusercontent.com
          // https://github.com/{owner}/{repo}/blob/{ref}/{path}
          if (u.hostname === "github.com") {
            var m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
            if (m) {
              return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3];
            }
          }
          // Gist page -> append /raw (gist.github.com/{user}/{id})
          if (u.hostname === "gist.github.com") {
            if (!/\/raw(\/|$)/.test(u.pathname)) {
              return u.origin + u.pathname.replace(/\/$/, "") + "/raw" + u.search;
            }
          }
          return url;
        } catch (e) {
          console.error("[" + SLUG + "] toRawUrl", e);
          return url;
        }
      }

      // Derive a document title from the URL's last path segment.
      function deriveTitle(url) {
        try {
          var u = new URL(url);
          var parts = u.pathname.split("/").filter(Boolean);
          var last = parts.length ? parts[parts.length - 1] : "";
          last = decodeURIComponent(last).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
          return last || u.hostname || "Imported diagram";
        } catch (e) {
          return "Imported diagram";
        }
      }

      function doImport(rawInputUrl, errEl, importBtn) {
        var value = (rawInputUrl || "").trim();
        errEl.classList.remove(SLUG + "-show");
        if (!value) {
          errEl.innerHTML = "<strong>Enter a URL</strong> to a Mermaid or text file.";
          errEl.classList.add(SLUG + "-show");
          return;
        }
        if (!/^https?:\/\//i.test(value)) {
          errEl.innerHTML = "<strong>Invalid URL.</strong> Must start with http:// or https://";
          errEl.classList.add(SLUG + "-show");
          return;
        }

        var fetchUrl = toRawUrl(value);
        if (importBtn) { importBtn.disabled = true; importBtn.textContent = "Importing…"; }

        fetch(fetchUrl, { method: "GET", mode: "cors" })
          .then(function (res) {
            if (!res.ok) {
              throw new Error("HTTP " + res.status + " " + (res.statusText || ""));
            }
            return res.text();
          })
          .then(function (text) {
            if (text == null || !String(text).trim()) {
              throw new Error("The fetched file is empty.");
            }
            MS.createDoc();
            MS.setCode(String(text));
            MS.setTitle(deriveTitle(value));
            MS.rerender();
            MS.closeModal();
            MS.toast("Imported from URL");
          })
          .catch(function (err) {
            console.error("[" + SLUG + "] import failed", err);
            var msg = err && err.message ? err.message : String(err);
            errEl.innerHTML =
              "<strong>Import failed.</strong> " + escapeHtml(msg) +
              " — the server may block cross-origin requests (CORS), " +
              "or the URL may be wrong. Try a raw file URL.";
            errEl.classList.add(SLUG + "-show");
          })
          .then(function () {
            if (importBtn) { importBtn.disabled = false; importBtn.textContent = "Import"; }
          });
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function openImportModal() {
        try {
          MS.openModal({
            title: "Import from URL",
            width: "460px",
            onMount: function (body) {
              var form = document.createElement("div");
              form.className = SLUG + "-form";

              var field = document.createElement("div");
              field.className = "ms-field";

              var label = document.createElement("label");
              label.textContent = "Diagram URL";
              label.setAttribute("for", SLUG + "-input");

              var input = document.createElement("input");
              input.className = "ms-input";
              input.id = SLUG + "-input";
              input.type = "url";
              input.placeholder = "https://raw.githubusercontent.com/user/repo/main/diagram.mmd";
              input.autocomplete = "off";
              input.spellcheck = false;

              field.appendChild(label);
              field.appendChild(input);

              var hint = document.createElement("p");
              hint.className = SLUG + "-hint";
              hint.textContent =
                "GitHub blob links and gist links are rewritten to raw automatically. " +
                "The remote server must allow cross-origin requests.";

              var errEl = document.createElement("div");
              errEl.className = SLUG + "-err";
              errEl.id = SLUG + "-error";
              errEl.setAttribute("role", "alert");

              var row = document.createElement("div");
              row.className = "ms-btn-row";

              var importBtn = document.createElement("button");
              importBtn.className = "ms-btn ms-btn--primary";
              importBtn.id = SLUG + "-go";
              importBtn.type = "button";
              importBtn.textContent = "Import";

              var cancelBtn = document.createElement("button");
              cancelBtn.className = "ms-btn";
              cancelBtn.type = "button";
              cancelBtn.textContent = "Cancel";

              importBtn.addEventListener("click", function () {
                doImport(input.value, errEl, importBtn);
              });
              cancelBtn.addEventListener("click", function () { MS.closeModal(); });
              input.addEventListener("keydown", function (e) {
                if (e.key === "Enter") { e.preventDefault(); doImport(input.value, errEl, importBtn); }
              });

              row.appendChild(importBtn);
              row.appendChild(cancelBtn);

              form.appendChild(field);
              form.appendChild(hint);
              form.appendChild(errEl);
              form.appendChild(row);
              body.appendChild(form);

              setTimeout(function () { try { input.focus(); } catch (e) {} }, 0);
            }
          });
        } catch (e) {
          console.error("[" + SLUG + "] openImportModal", e);
          MS.toast("Could not open Import dialog");
        }
      }

      MS.addTopbarButton({
        id: "importUrlBtn",
        title: "Import a diagram from a URL",
        label: "Import URL",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
        onClick: openImportModal
      });

      MS.registerCommand({
        id: "import-url.open",
        title: "Import from URL",
        run: openImportModal
      });
    } catch (e) {
      console.error("[import-url] setup failed", e);
    }
  });
})();
