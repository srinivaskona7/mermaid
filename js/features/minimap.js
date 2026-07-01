/* Feature: Preview Minimap — a small overview thumbnail of the current diagram
   pinned to the bottom-right of the preview host. No external CDN libs. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var STORE_KEY = "minimap.on";
      var MAX = 180; // px, longest edge of the thumbnail

      MS.injectCSS(
        [
          "#minimap-box{",
          "  position:absolute; right:12px; bottom:12px; z-index:5;",
          "  max-width:" + MAX + "px; max-height:" + MAX + "px;",
          "  padding:4px; box-sizing:border-box;",
          "  background:var(--surface); border:1px solid var(--border);",
          "  border-radius:var(--radius);",
          "  box-shadow:0 4px 14px rgba(0,0,0,.18);",
          "  pointer-events:none; overflow:hidden;",
          "  display:flex; align-items:center; justify-content:center;",
          "}",
          "#minimap-box[hidden]{display:none;}",
          "#minimap-box svg{display:block; max-width:100%; max-height:100%;",
          "  width:auto; height:auto;}",
          "#minimap-box .minimap-empty{",
          "  font:11px/1.3 system-ui,sans-serif; color:var(--text);",
          "  opacity:.6; padding:8px; text-align:center;",
          "}",
          "#minimapBtn.chip.minimap-on{color:var(--accent); border-color:var(--accent);}",
        ].join("\n"),
        "minimap-css"
      );

      // --- state ---
      var enabled = false;
      try {
        enabled = !!MS.get(STORE_KEY, false);
      } catch (e) {
        console.error("[minimap] read setting", e);
      }

      // --- overview container, mounted inside the preview host ---
      var host = null;
      try {
        host = (MS.els && MS.els.previewHost) || MS.el("previewHost");
      } catch (e) {
        console.error("[minimap] locate host", e);
      }

      var box = document.createElement("div");
      box.id = "minimap-box";
      box.setAttribute("aria-hidden", "true");
      box.hidden = true;
      if (host) {
        // The host is positioned; ensure our absolute box anchors to it.
        try {
          var cs = window.getComputedStyle(host);
          if (cs && cs.position === "static") host.style.position = "relative";
        } catch (e) {
          console.error("[minimap] host position", e);
        }
        host.appendChild(box);
      }

      function clearBox() {
        while (box.firstChild) box.removeChild(box.firstChild);
      }

      function renderThumb() {
        if (!enabled || !box) return;
        try {
          var svg = MS.getSvgElement();
          clearBox();
          if (!svg) {
            var em = document.createElement("div");
            em.className = "minimap-empty";
            em.textContent = "No diagram";
            box.appendChild(em);
            return;
          }
          var clone = svg.cloneNode(true);
          // Strip any pan/zoom transform so the thumbnail shows the whole graph.
          clone.removeAttribute("style");
          var vp = clone.querySelector(".svg-pan-zoom_viewport");
          if (vp) vp.removeAttribute("transform");
          // Force it to scale into the box rather than fill the pane.
          clone.setAttribute("width", "100%");
          clone.setAttribute("height", "100%");
          clone.style.maxWidth = MAX + "px";
          clone.style.maxHeight = MAX + "px";
          clone.style.pointerEvents = "none";
          clone.removeAttribute("id");
          box.appendChild(clone);
        } catch (e) {
          console.error("[minimap] renderThumb", e);
        }
      }

      function apply() {
        if (!box) return;
        box.hidden = !enabled;
        if (btn) btn.classList.toggle("minimap-on", enabled);
        if (enabled) renderThumb();
        else clearBox();
      }

      function toggle() {
        enabled = !enabled;
        try {
          MS.set(STORE_KEY, enabled);
        } catch (e) {
          console.error("[minimap] persist", e);
        }
        apply();
      }

      // --- preview toolbar toggle ---
      var btn = null;
      try {
        btn = MS.addPreviewButton({
          id: "minimapBtn",
          label: "Map",
          title: "Toggle preview minimap",
          icon:
            '<svg viewBox="0 0 24 24" class="ico" width="16" height="16" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' +
            '<polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21"/>' +
            '<line x1="8" y1="3" x2="8" y2="18"/>' +
            '<line x1="16" y1="6" x2="16" y2="21"/></svg>',
          onClick: toggle,
        });
      } catch (e) {
        console.error("[minimap] addPreviewButton", e);
      }

      // --- keep the thumbnail fresh ---
      try {
        MS.on("render", function () {
          if (enabled) renderThumb();
        });
      } catch (e) {
        console.error("[minimap] on render", e);
      }

      // --- initial state ---
      apply();
    } catch (e) {
      console.error("[minimap] init", e);
    }
  });
})();
