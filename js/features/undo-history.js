/* Feature: Snapshot History — keeps a per-document timeline of code snapshots.
 *
 * On MS.on("change") it debounces ~2s and pushes a snapshot {time, code}
 * (capped at ~30) into an in-memory ring, persisted per docId via MS.set().
 * A topbar "History" button (and command) opens a modal listing snapshots
 * (relative time + first line) with a Restore button that MS.setCode()s the
 * chosen snapshot. Namespace prefix: "hist-". No external CDN libs. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "undo-history";
      var STORE_PREFIX = "hist-snaps."; // + docId
      var DEBOUNCE_MS = 2000;
      var CAP = 30;

      // docId -> [{time, code}] (newest first). Loaded lazily per doc.
      var cache = {};
      var debounceTimer = null;

      // ---------------------------------------------------------------
      // Styling — theme vars only, no hardcoded surface colors.
      // ---------------------------------------------------------------
      try {
        MS.injectCSS(
          [
            ".hist-list{display:flex;flex-direction:column;gap:8px;max-height:56vh;overflow:auto;}",
            ".hist-item{",
            "  display:flex;align-items:center;gap:10px;",
            "  padding:8px 10px;box-sizing:border-box;",
            "  background:var(--surface);color:var(--text);",
            "  border:1px solid var(--border);border-radius:var(--radius);",
            "}",
            ".hist-item__main{flex:1 1 auto;min-width:0;}",
            ".hist-item__line{",
            "  font:13px/1.3 system-ui,sans-serif;font-weight:600;",
            "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
            "}",
            ".hist-item__time{font-size:11px;opacity:.65;margin-top:2px;}",
            ".hist-item--current{border-color:var(--accent);}",
            ".hist-badge{",
            "  font-size:10px;text-transform:uppercase;letter-spacing:.04em;",
            "  color:var(--accent);font-weight:700;",
            "}",
            ".hist-empty{opacity:.65;font:13px/1.5 system-ui,sans-serif;padding:8px 2px;}",
          ].join("\n"),
          SLUG + "-css"
        );
      } catch (e) {
        console.error("[" + SLUG + "] injectCSS", e);
      }

      // ---------------------------------------------------------------
      // Persistence helpers
      // ---------------------------------------------------------------
      function activeDocId() {
        try {
          var d = MS.getActiveDoc();
          return d && d.id ? d.id : null;
        } catch (e) {
          console.error("[" + SLUG + "] getActiveDoc", e);
          return null;
        }
      }

      function loadSnaps(docId) {
        if (!docId) return [];
        if (cache[docId]) return cache[docId];
        var arr = [];
        try {
          var stored = MS.get(STORE_PREFIX + docId, null);
          if (Object.prototype.toString.call(stored) === "[object Array]") {
            arr = stored.filter(function (s) {
              return s && typeof s.code === "string" && typeof s.time === "number";
            });
          }
        } catch (e) {
          console.error("[" + SLUG + "] loadSnaps", e);
        }
        cache[docId] = arr;
        return arr;
      }

      function saveSnaps(docId, arr) {
        if (!docId) return;
        cache[docId] = arr;
        try {
          MS.set(STORE_PREFIX + docId, arr);
        } catch (e) {
          console.error("[" + SLUG + "] saveSnaps", e);
        }
      }

      // Push a snapshot for the active doc if code changed since the last one.
      function pushSnapshot() {
        try {
          var docId = activeDocId();
          if (!docId) return;
          var code = MS.getCode();
          if (typeof code !== "string") return;
          var arr = loadSnaps(docId);
          if (arr.length && arr[0].code === code) return; // no-op change
          arr.unshift({ time: Date.now(), code: code });
          if (arr.length > CAP) arr.length = CAP;
          saveSnaps(docId, arr);
        } catch (e) {
          console.error("[" + SLUG + "] pushSnapshot", e);
        }
      }

      // ---------------------------------------------------------------
      // Formatting
      // ---------------------------------------------------------------
      function firstLine(code) {
        try {
          var lines = (code || "").split("\n");
          for (var i = 0; i < lines.length; i++) {
            var t = lines[i].trim();
            if (t && t.indexOf("%%") !== 0) return t;
          }
          var first = (lines[0] || "").trim();
          return first || "(empty)";
        } catch (e) {
          console.error("[" + SLUG + "] firstLine", e);
          return "(snapshot)";
        }
      }

      function relTime(ts) {
        try {
          var diff = Math.max(0, Date.now() - ts);
          var s = Math.floor(diff / 1000);
          if (s < 5) return "just now";
          if (s < 60) return s + "s ago";
          var m = Math.floor(s / 60);
          if (m < 60) return m + "m ago";
          var h = Math.floor(m / 60);
          if (h < 24) return h + "h ago";
          var d = Math.floor(h / 24);
          if (d < 7) return d + "d ago";
          return new Date(ts).toLocaleDateString();
        } catch (e) {
          console.error("[" + SLUG + "] relTime", e);
          return "";
        }
      }

      // ---------------------------------------------------------------
      // Modal
      // ---------------------------------------------------------------
      function openHistory() {
        try {
          var docId = activeDocId();
          var arr = loadSnaps(docId);
          var current = "";
          try {
            current = MS.getCode() || "";
          } catch (e) {
            console.error("[" + SLUG + "] getCode", e);
          }

          var wrap = document.createElement("div");

          if (!arr.length) {
            var empty = document.createElement("div");
            empty.className = "hist-empty";
            empty.textContent =
              "No snapshots yet. Edit the diagram and they'll appear here.";
            wrap.appendChild(empty);
          } else {
            var list = document.createElement("div");
            list.className = "hist-list";
            list.id = "hist-list";

            arr.forEach(function (snap) {
              var item = document.createElement("div");
              item.className = "hist-item";
              var isCurrent = snap.code === current;
              if (isCurrent) item.className += " hist-item--current";

              var main = document.createElement("div");
              main.className = "hist-item__main";

              var line = document.createElement("div");
              line.className = "hist-item__line";
              line.textContent = firstLine(snap.code);
              main.appendChild(line);

              var time = document.createElement("div");
              time.className = "hist-item__time";
              time.textContent = relTime(snap.time);
              main.appendChild(time);

              item.appendChild(main);

              if (isCurrent) {
                var badge = document.createElement("span");
                badge.className = "hist-badge";
                badge.textContent = "current";
                item.appendChild(badge);
              } else {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "ms-btn";
                btn.textContent = "Restore";
                btn.addEventListener("click", function () {
                  restore(snap);
                });
                item.appendChild(btn);
              }

              list.appendChild(item);
            });

            wrap.appendChild(list);
          }

          MS.openModal({
            title: "Snapshot History",
            node: wrap,
            width: 460,
          });
        } catch (e) {
          console.error("[" + SLUG + "] openHistory", e);
          try {
            MS.toast("Could not open history");
          } catch (e2) {
            console.error("[" + SLUG + "] toast", e2);
          }
        }
      }

      function restore(snap) {
        try {
          if (!snap || typeof snap.code !== "string") return;
          MS.setCode(snap.code);
          try {
            MS.closeModal();
          } catch (e) {
            console.error("[" + SLUG + "] closeModal", e);
          }
          try {
            MS.toast("Snapshot restored");
          } catch (e) {
            console.error("[" + SLUG + "] toast", e);
          }
        } catch (e) {
          console.error("[" + SLUG + "] restore", e);
        }
      }

      // ---------------------------------------------------------------
      // Wiring: debounced change capture
      // ---------------------------------------------------------------
      try {
        MS.on("change", function () {
          try {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
              debounceTimer = null;
              pushSnapshot();
            }, DEBOUNCE_MS);
          } catch (e) {
            console.error("[" + SLUG + "] change handler", e);
          }
        });
      } catch (e) {
        console.error("[" + SLUG + "] on change", e);
      }

      // Capture a baseline snapshot for the doc we switch into, and flush the
      // pending debounce so a mid-edit switch doesn't lose the prior doc's edit.
      try {
        MS.on("docswitch", function () {
          try {
            if (debounceTimer) {
              clearTimeout(debounceTimer);
              debounceTimer = null;
              pushSnapshot(); // snapshot belongs to the now-active doc's code
            }
          } catch (e) {
            console.error("[" + SLUG + "] docswitch handler", e);
          }
        });
      } catch (e) {
        console.error("[" + SLUG + "] on docswitch", e);
      }

      // ---------------------------------------------------------------
      // UI entry points
      // ---------------------------------------------------------------
      try {
        MS.addTopbarButton({
          id: "hist-btn",
          label: "History",
          title: "Snapshot history for this diagram",
          icon:
            '<svg viewBox="0 0 24 24" class="ico" width="16" height="16" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 3v5h5"/>' +
            '<path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>' +
            '<path d="M12 7v5l3 2"/></svg>',
          onClick: openHistory,
        });
      } catch (e) {
        console.error("[" + SLUG + "] addTopbarButton", e);
      }

      try {
        MS.registerCommand({
          id: SLUG + ".open",
          title: "History: Show snapshots",
          run: openHistory,
        });
      } catch (e) {
        console.error("[" + SLUG + "] registerCommand", e);
      }
    } catch (e) {
      console.error("[undo-history] init", e);
    }
  });
})();
