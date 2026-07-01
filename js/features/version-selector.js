/* Feature: Mermaid Version Selector — switch the mermaid runtime version via CDN.
 *
 * DYNAMIC CDN: This feature loads a mermaid runtime build on demand by injecting
 * a <script> tag pointing at:
 *   https://cdn.jsdelivr.net/npm/mermaid@<ver>/dist/mermaid.min.js
 * It only does so when the user picks a non-default version, and it is the sole
 * reason this module needs an external network request. Documented per API rule 5.
 */
(function () {
  "use strict";

  var SLUG = "version-selector";
  var STORE_KEY = "version-selector.version";
  var CDN = function (ver) {
    return "https://cdn.jsdelivr.net/npm/mermaid@" + ver + "/dist/mermaid.min.js";
  };

  // Available versions. "11" tracks latest on the CDN.
  var VERSIONS = [
    { value: "11", label: "11 (latest)" },
    { value: "11.4.1", label: "11.4.1" },
    { value: "10.9.3", label: "10.9.3" },
    { value: "10.6.1", label: "10.6.1" }
  ];

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        ".version-selector-wrap{display:inline-flex;align-items:center;gap:6px;}" +
          ".version-selector-select{" +
          "appearance:none;-webkit-appearance:none;" +
          "background:var(--surface);color:var(--text);" +
          "border:1px solid var(--border);border-radius:var(--radius);" +
          "padding:6px 26px 6px 10px;font:inherit;font-size:13px;cursor:pointer;" +
          "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/></svg>\");" +
          "background-repeat:no-repeat;background-position:right 9px center;" +
          "}" +
          ".version-selector-select:focus{outline:2px solid var(--accent);outline-offset:1px;}" +
          ".version-selector-select:disabled{opacity:.6;cursor:progress;}",
        SLUG + "-css"
      );

      // ---- Build the select, styled to sit in the topbar like a .control ----
      var host = document.querySelector(".topbar__actions");
      if (!host) {
        console.error("[" + SLUG + "] topbar actions host not found");
        return;
      }

      var wrap = document.createElement("div");
      wrap.className = "version-selector-wrap";
      wrap.id = "version-selector-wrap";

      var sel = document.createElement("select");
      sel.className = "version-selector-select";
      sel.id = "version-selector-select";
      sel.title = "Mermaid runtime version";
      sel.setAttribute("aria-label", "Mermaid runtime version");

      VERSIONS.forEach(function (v) {
        var o = document.createElement("option");
        o.value = v.value;
        o.textContent = "mermaid " + v.label;
        sel.appendChild(o);
      });

      wrap.appendChild(sel);
      host.insertBefore(wrap, host.firstChild);

      // Track the version currently active in the runtime so we can revert on failure.
      var appliedVersion = "11";
      var loading = false;

      function isValid(ver) {
        return VERSIONS.some(function (v) {
          return v.value === ver;
        });
      }

      // Inject a CDN mermaid build, resolving once window.mermaid is replaced.
      function loadVersion(ver) {
        return new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = CDN(ver);
          s.async = true;
          s.setAttribute("data-version-selector-version", ver);
          s.onload = function () {
            resolve();
          };
          s.onerror = function () {
            if (s.parentNode) s.parentNode.removeChild(s);
            reject(new Error("Failed to load mermaid " + ver));
          };
          document.head.appendChild(s);
        });
      }

      function applyVersion(ver, opts) {
        opts = opts || {};
        if (!isValid(ver)) ver = "11";
        if (loading) return;
        loading = true;
        sel.disabled = true;

        loadVersion(ver)
          .then(function () {
            try {
              MS.reinitMermaid();
              MS.rerender();
            } catch (e) {
              console.error("[" + SLUG + "] reinit/rerender failed", e);
            }
            appliedVersion = ver;
            sel.value = ver;
            try {
              MS.set(STORE_KEY, ver);
            } catch (e) {
              console.error("[" + SLUG + "] persist failed", e);
            }
            var label = labelFor(ver);
            if (!opts.silent) MS.toast("Mermaid runtime: " + label);
          })
          .catch(function (err) {
            console.error("[" + SLUG + "]", err);
            try {
              MS.toast("Could not load mermaid " + ver + " — kept " + appliedVersion);
            } catch (e) {
              console.error("[" + SLUG + "] toast failed", e);
            }
            sel.value = appliedVersion; // revert the control to the working version
          })
          .then(function () {
            loading = false;
            sel.disabled = false;
          });
      }

      function labelFor(ver) {
        var found = VERSIONS.filter(function (v) {
          return v.value === ver;
        })[0];
        return found ? found.label : ver;
      }

      sel.addEventListener("change", function () {
        applyVersion(sel.value);
      });

      MS.registerCommand({
        id: SLUG + ".reload",
        title: "Version: Reload current mermaid runtime",
        run: function () {
          applyVersion(sel.value);
        }
      });

      // ---- Restore persisted choice on load ----
      var saved;
      try {
        saved = MS.get(STORE_KEY, "11");
      } catch (e) {
        console.error("[" + SLUG + "] read persisted failed", e);
        saved = "11";
      }
      if (!isValid(saved)) saved = "11";
      sel.value = saved;

      // The app boots with mermaid v11 already loaded (index.html). Only fetch a
      // CDN build if the saved choice differs from the baseline runtime.
      if (saved === "11") {
        appliedVersion = "11";
      } else {
        applyVersion(saved, { silent: false });
      }
    } catch (e) {
      console.error("[" + SLUG + "] init failed", e);
    }
  });
})();
