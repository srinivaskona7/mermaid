/* Feature: Template Gallery — browse all MS.TEMPLATES in a searchable grid of live SVG thumbnails */
/* No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        [
          ".gal-toolbar{margin-bottom:14px}",
          ".gal-search{width:100%}",
          ".gal-count{margin:8px 2px 12px;font-size:12px;opacity:.7;color:var(--text)}",
          ".gal-grid{max-height:60vh;overflow:auto;padding:2px}",
          ".gal-card{cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:border-color .12s ease,transform .12s ease}",
          ".gal-card:hover,.gal-card:focus-visible{border-color:var(--accent);transform:translateY(-2px);outline:none}",
          ".gal-thumb{display:flex;align-items:center;justify-content:center;height:120px;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}",
          ".gal-thumb svg{max-width:100%;max-height:118px;height:auto;width:auto}",
          ".gal-thumb--err{font-size:11px;opacity:.55;color:var(--text)}",
          ".gal-empty{padding:24px 2px;text-align:center;opacity:.6;color:var(--text)}"
        ].join("\n"),
        "gallery-css"
      );

      var templates = (MS.TEMPLATES || []).slice();

      function loadTemplate(t) {
        try {
          MS.setCode(t.code || "");
          if (t.name) MS.setTitle(t.name);
          MS.closeModal();
          MS.focusEditor();
          MS.toast("Loaded template: " + (t.name || "Untitled"));
        } catch (e) {
          console.error("[gallery] loadTemplate failed", e);
        }
      }

      // Render one template's SVG into a thumbnail host (async, fail-safe).
      function renderThumb(host, t, idx) {
        var mm = MS.MERMAID;
        if (!mm || typeof mm.render !== "function" || !t.code) {
          host.className = "gal-thumb gal-thumb--err";
          host.textContent = "No preview";
          return;
        }
        try {
          var id = "gal-thumb-" + idx + "-" + Date.now();
          var result = mm.render(id, t.code);
          if (result && typeof result.then === "function") {
            result.then(function (out) {
              try { host.innerHTML = (out && out.svg) || ""; }
              catch (e) { console.error("[gallery] thumb inject", e); }
            }).catch(function (err) {
              console.error("[gallery] thumb render", err);
              host.className = "gal-thumb gal-thumb--err";
              host.textContent = "No preview";
            });
          } else if (result && result.svg) {
            host.innerHTML = result.svg;
          } else {
            host.className = "gal-thumb gal-thumb--err";
            host.textContent = "No preview";
          }
        } catch (e) {
          console.error("[gallery] thumb render sync", e);
          host.className = "gal-thumb gal-thumb--err";
          host.textContent = "No preview";
        }
      }

      function buildCard(t, idx) {
        var card = document.createElement("div");
        card.className = "ms-card gal-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.title = "Load: " + (t.name || "Untitled");

        var thumb = document.createElement("div");
        thumb.className = "gal-thumb";

        var title = document.createElement("div");
        title.className = "ms-card__title";
        title.textContent = t.name || "Untitled template";

        card.appendChild(thumb);
        card.appendChild(title);

        card.addEventListener("click", function () { loadTemplate(t); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadTemplate(t); }
        });

        renderThumb(thumb, t, idx);
        return card;
      }

      function openGallery() {
        try {
          var node = document.createElement("div");

          var toolbar = document.createElement("div");
          toolbar.className = "gal-toolbar ms-field";
          var search = document.createElement("input");
          search.type = "search";
          search.className = "ms-input gal-search";
          search.placeholder = "Search templates by name…";
          toolbar.appendChild(search);

          var count = document.createElement("div");
          count.className = "gal-count";

          var grid = document.createElement("div");
          grid.className = "ms-grid gal-grid";

          node.appendChild(toolbar);
          node.appendChild(count);
          node.appendChild(grid);

          function render(filter) {
            grid.innerHTML = "";
            var q = (filter || "").trim().toLowerCase();
            var shown = 0;
            templates.forEach(function (t, idx) {
              var name = (t && t.name ? String(t.name) : "").toLowerCase();
              if (q && name.indexOf(q) === -1) return;
              grid.appendChild(buildCard(t, idx));
              shown++;
            });
            if (!shown) {
              var empty = document.createElement("div");
              empty.className = "gal-empty";
              empty.textContent = templates.length
                ? "No templates match \"" + (filter || "") + "\""
                : "No templates available";
              grid.appendChild(empty);
            }
            count.textContent = shown + " of " + templates.length + " template" + (templates.length === 1 ? "" : "s");
          }

          MS.openModal({
            title: "Template Gallery",
            width: "920px",
            node: node,
            onMount: function () {
              try {
                render("");
                search.addEventListener("input", function () { render(search.value); });
                search.focus();
              } catch (e) {
                console.error("[gallery] onMount", e);
              }
            }
          });
        } catch (e) {
          console.error("[gallery] openGallery", e);
        }
      }

      MS.addTopbarButton({
        id: "galBtn",
        label: "Gallery",
        title: "Browse template gallery",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
        onClick: openGallery
      });

      MS.registerCommand({
        id: "gallery.open",
        title: "Template Gallery: Open",
        run: openGallery
      });
    } catch (e) {
      console.error("[gallery] setup failed", e);
    }
  });
})();
