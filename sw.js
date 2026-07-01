/* Mermaid Studio service worker — offline-first for the app shell,
   cache-first with network fallback for CDN libraries. */
const VERSION = "mstudio-v5";
const FEATURES = [
  "command-palette", "sequence-examples", "version-selector", "diagram-config",
  "export-pdf", "search-replace", "shortcuts-help", "layout-direction", "bg-toggle",
  "minimap", "editor-fontsize", "word-wrap", "import-url", "present-mode",
  "diagram-stats", "theme-editor", "qr-share", "split-orientation", "auto-theme",
  "gallery", "snippets", "autocomplete", "undo-history", "copy-markdown",
  "embed-code", "print-diagram", "line-numbers-toggle", "lint-gutter",
  "more-types", "accessibility", "auto-fix",
].map((s) => "./js/features/" + s + ".js");

const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/templates.js",
  "./js/features/index.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  ...FEATURES,
];

self.addEventListener("install", (e) => {
  // Cache each item independently so one missing file can't fail the install.
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isCDN = url.origin !== location.origin;

  if (isCDN) {
    // Cache-first for CDN libs (mermaid, codemirror, svg-pan-zoom).
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        }).catch(() => hit)
      )
    );
  } else {
    // Network-first for app shell so updates land quickly; fall back to cache offline.
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
    );
  }
});
