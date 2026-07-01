/* Feature: QR Share Code — show a scannable QR of the shareable link in a modal.
 *
 * CDN: NONE. The QR code is generated fully client-side by a small inline
 * byte-mode QR encoder (below). No external <script> is injected.
 *
 * API used (all documented in js/features/_API.md):
 *   MS.ready, MS.injectCSS, MS.addTopbarButton, MS.registerCommand,
 *   MS.openModal, MS.makeShareLink, MS.copyText, MS.toast
 */
(function () {
  "use strict";

  // ==========================================================================
  // Minimal QR Code encoder (byte mode, versions 1..10, EC level M/L auto).
  // Self-contained — no dependencies. Returns a boolean module matrix.
  // Adapted to be small; supports links comfortably up to a few hundred bytes.
  // ==========================================================================
  var QR = (function () {
    // Galois field tables for Reed-Solomon.
    var EXP = new Array(256), LOG = new Array(256);
    (function () {
      var x = 1;
      for (var i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (var j = 255; j < 256; j++) EXP[j] = EXP[j - 255];
    })();
    function gmul(a, b) {
      if (a === 0 || b === 0) return 0;
      return EXP[(LOG[a] + LOG[b]) % 255];
    }
    function rsPoly(n) {
      var poly = [1];
      for (var i = 0; i < n; i++) {
        var np = [];
        for (var j = 0; j <= poly.length; j++) np[j] = 0;
        for (var k = 0; k < poly.length; k++) {
          np[k] ^= poly[k];
          np[k + 1] ^= gmul(poly[k], EXP[i]);
        }
        poly = np;
      }
      return poly;
    }
    function rsEncode(data, ecLen) {
      var gen = rsPoly(ecLen);
      var res = data.slice().concat(new Array(ecLen).fill(0));
      for (var i = 0; i < data.length; i++) {
        var coef = res[i];
        if (coef !== 0) {
          for (var j = 0; j < gen.length; j++) {
            res[i + j] ^= gmul(gen[j], coef);
          }
        }
      }
      return res.slice(data.length);
    }

    // Per-version capacity (byte mode) and EC parameters.
    // Each entry: [ totalCodewords, ecCodewordsPerBlock, numBlocksG1, dataCwG1, numBlocksG2, dataCwG2 ]
    // Level M (medium) for robustness. Versions 1..10.
    var VERSIONS = {
      1:  [26, 10, 1, 16, 0, 0],
      2:  [44, 16, 1, 28, 0, 0],
      3:  [70, 26, 1, 44, 0, 0],
      4:  [100, 18, 2, 32, 0, 0],
      5:  [134, 24, 2, 43, 0, 0],
      6:  [172, 16, 4, 27, 0, 0],
      7:  [196, 18, 4, 31, 0, 0],
      8:  [242, 22, 2, 38, 2, 39],
      9:  [292, 22, 3, 36, 2, 37],
      10: [346, 26, 4, 43, 1, 44]
    };
    // Alignment pattern center coordinates by version.
    var ALIGN = {
      1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
      6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
    };

    function sizeForVersion(v) { return v * 4 + 17; }

    function dataCapacityBits(v) {
      var p = VERSIONS[v];
      var totalData = p[2] * p[3] + p[4] * p[5];
      return totalData * 8;
    }

    // Build the final interleaved codeword stream for a version.
    function buildCodewords(bytes, v) {
      var p = VERSIONS[v];
      var ecLen = p[1];
      var g1n = p[2], g1d = p[3], g2n = p[4], g2d = p[5];
      var totalDataCw = g1n * g1d + g2n * g2d;

      // --- bit stream ---
      var bits = [];
      function push(val, len) {
        for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
      }
      push(0b0100, 4); // byte mode
      // char count: 8 bits for versions 1..9, 16 bits for 10+
      push(bytes.length, v >= 10 ? 16 : 8);
      for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);

      var capBits = totalDataCw * 8;
      // terminator
      var term = Math.min(4, capBits - bits.length);
      for (var t = 0; t < term; t++) bits.push(0);
      // pad to byte boundary
      while (bits.length % 8 !== 0) bits.push(0);
      // pad bytes
      var padBytes = [0xEC, 0x11];
      var pi = 0;
      while (bits.length < capBits) {
        push(padBytes[pi % 2], 8);
        pi++;
      }

      // to data codewords
      var dataCw = [];
      for (var b = 0; b < bits.length; b += 8) {
        var byte = 0;
        for (var k = 0; k < 8; k++) byte = (byte << 1) | bits[b + k];
        dataCw.push(byte);
      }

      // split into blocks
      var blocks = [];
      var idx = 0;
      for (var gb = 0; gb < g1n; gb++) { blocks.push(dataCw.slice(idx, idx + g1d)); idx += g1d; }
      for (var gb2 = 0; gb2 < g2n; gb2++) { blocks.push(dataCw.slice(idx, idx + g2d)); idx += g2d; }

      var ecBlocks = blocks.map(function (blk) { return rsEncode(blk, ecLen); });

      // interleave data
      var out = [];
      var maxData = Math.max(g1d, g2d);
      for (var c = 0; c < maxData; c++) {
        for (var bl = 0; bl < blocks.length; bl++) {
          if (c < blocks[bl].length) out.push(blocks[bl][c]);
        }
      }
      // interleave ec
      for (var ce = 0; ce < ecLen; ce++) {
        for (var ble = 0; ble < ecBlocks.length; ble++) {
          out.push(ecBlocks[ble][ce]);
        }
      }
      return out;
    }

    // Place modules into the matrix.
    function makeMatrix(codewords, v) {
      var n = sizeForVersion(v);
      var m = [];
      var reserved = [];
      for (var r = 0; r < n; r++) {
        m[r] = new Array(n).fill(null);
        reserved[r] = new Array(n).fill(false);
      }
      function setF(r, c, val) { m[r][c] = val ? 1 : 0; reserved[r][c] = true; }

      // finder pattern
      function finder(r0, c0) {
        for (var r = -1; r <= 7; r++) {
          for (var c = -1; c <= 7; c++) {
            var rr = r0 + r, cc = c0 + c;
            if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
            var inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6));
            var inCore = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setF(rr, cc, inRing || inCore ? 1 : 0);
          }
        }
      }
      finder(0, 0);
      finder(0, n - 7);
      finder(n - 7, 0);

      // timing patterns
      for (var i = 8; i < n - 8; i++) {
        setF(6, i, i % 2 === 0 ? 1 : 0);
        setF(i, 6, i % 2 === 0 ? 1 : 0);
      }

      // dark module
      setF(n - 8, 8, 1);

      // alignment patterns
      var centers = ALIGN[v];
      for (var a = 0; a < centers.length; a++) {
        for (var b2 = 0; b2 < centers.length; b2++) {
          var cr = centers[a], cc2 = centers[b2];
          // skip overlap with finders
          if ((cr <= 8 && cc2 <= 8) || (cr <= 8 && cc2 >= n - 9) || (cr >= n - 9 && cc2 <= 8)) continue;
          for (var dr = -2; dr <= 2; dr++) {
            for (var dc = -2; dc <= 2; dc++) {
              var isRing = Math.max(Math.abs(dr), Math.abs(dc)) === 2 || (dr === 0 && dc === 0);
              setF(cr + dr, cc2 + dc, isRing ? 1 : 0);
            }
          }
        }
      }

      // reserve format info areas
      for (var fi = 0; fi <= 8; fi++) {
        if (!reserved[8][fi]) reserved[8][fi] = true;
        if (!reserved[fi][8]) reserved[fi][8] = true;
        if (fi < 8) { if (!reserved[8][n - 1 - fi]) reserved[8][n - 1 - fi] = true; }
        if (fi < 7) { if (!reserved[n - 1 - fi][8]) reserved[n - 1 - fi][8] = true; }
      }

      // place data bits (zig-zag)
      var bitBuf = [];
      for (var cw = 0; cw < codewords.length; cw++) {
        for (var bt = 7; bt >= 0; bt--) bitBuf.push((codewords[cw] >> bt) & 1);
      }
      var bit = 0;
      var upward = true;
      for (var col = n - 1; col > 0; col -= 2) {
        if (col === 6) col--; // skip timing column
        for (var rowi = 0; rowi < n; rowi++) {
          var row = upward ? n - 1 - rowi : rowi;
          for (var csub = 0; csub < 2; csub++) {
            var cc3 = col - csub;
            if (reserved[row][cc3]) continue;
            var dbit = bit < bitBuf.length ? bitBuf[bit] : 0;
            bit++;
            m[row][cc3] = dbit;
          }
        }
        upward = !upward;
      }

      return { m: m, reserved: reserved, n: n };
    }

    // Apply mask pattern 0 and encode format info (level M, mask 0).
    function applyMaskAndFormat(state) {
      var m = state.m, reserved = state.reserved, n = state.n;
      // mask 0: (row + col) % 2 == 0
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (!reserved[r][c] && m[r][c] !== null) {
            if ((r + c) % 2 === 0) m[r][c] ^= 1;
          }
        }
      }
      // format info for EC level M (0b00) + mask 0 (0b000) -> bits, BCH.
      // Precomputed 15-bit format string for (M, mask0): 0b101010000010010
      var fmt = 0b101010000010010;
      var fbits = [];
      for (var i = 14; i >= 0; i--) fbits.push((fmt >> i) & 1);
      // place around top-left
      // horizontal (row 8)
      var pos = 0;
      for (var c2 = 0; c2 <= 5; c2++) m[8][c2] = fbits[pos++];
      m[8][7] = fbits[pos++];
      m[8][8] = fbits[pos++];
      m[7][8] = fbits[pos++];
      for (var r2 = 5; r2 >= 0; r2--) m[r2][8] = fbits[pos++];
      // second copy
      pos = 0;
      for (var r3 = n - 1; r3 >= n - 7; r3--) m[r3][8] = fbits[pos++];
      for (var c3 = n - 8; c3 <= n - 1; c3++) m[8][c3] = fbits[pos++];
      return m;
    }

    // Public: encode a UTF-8 string to a matrix, or throw if too long.
    function encode(text) {
      var bytes = utf8Bytes(text);
      var v = -1;
      for (var ver = 1; ver <= 10; ver++) {
        // reserve 4 (mode) + count bits + terminator
        var countBits = ver >= 10 ? 16 : 8;
        var needed = 4 + countBits + bytes.length * 8;
        if (needed <= dataCapacityBits(ver)) { v = ver; break; }
      }
      if (v === -1) throw new Error("Link too long to encode as a QR code");
      var cw = buildCodewords(bytes, v);
      var state = makeMatrix(cw, v);
      var m = applyMaskAndFormat(state);
      return { modules: m, size: state.n, version: v, byteLen: bytes.length };
    }

    function utf8Bytes(str) {
      var out = [];
      var enc = encodeURIComponent(str);
      for (var i = 0; i < enc.length; i++) {
        if (enc[i] === "%") {
          out.push(parseInt(enc.substr(i + 1, 2), 16));
          i += 2;
        } else {
          out.push(enc.charCodeAt(i));
        }
      }
      return out;
    }

    return { encode: encode };
  })();

  // ==========================================================================
  // Draw a QR matrix onto a canvas using theme-aware colors.
  // ==========================================================================
  function drawToCanvas(canvas, result, opts) {
    opts = opts || {};
    var quiet = 4; // quiet zone modules
    var mods = result.size + quiet * 2;
    var scale = Math.max(2, Math.floor((opts.px || 240) / mods));
    var px = mods * scale;
    canvas.width = px;
    canvas.height = px;
    var ctx = canvas.getContext("2d");
    // Always render QR with high-contrast fixed colors so it stays scannable
    // in any theme. Only the surrounding UI uses theme vars.
    ctx.fillStyle = opts.light || "#ffffff";
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = opts.dark || "#000000";
    var m = result.modules;
    for (var r = 0; r < result.size; r++) {
      for (var c = 0; c < result.size; c++) {
        if (m[r][c]) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
  }

  // ==========================================================================
  // Feature setup — all inside MS.ready.
  // ==========================================================================
  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        [
          ".qrs-wrap{display:flex;flex-direction:column;gap:14px;align-items:stretch}",
          ".qrs-canvas-box{display:flex;justify-content:center;padding:14px;",
          "  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}",
          ".qrs-canvas-box canvas{image-rendering:pixelated;max-width:100%;height:auto;",
          "  border-radius:calc(var(--radius) / 2)}",
          ".qrs-link{width:100%;font-size:12px;word-break:break-all;resize:vertical;min-height:64px;",
          "  color:var(--text)}",
          ".qrs-meta{font-size:12px;color:var(--text);opacity:.7}",
          ".qrs-warn{font-size:12px;color:var(--accent);border:1px solid var(--border);",
          "  background:var(--surface);border-radius:var(--radius);padding:8px 10px}",
          ".qrs-fallback{font-size:12px;color:var(--text);opacity:.85;text-align:center;",
          "  padding:24px;border:1px dashed var(--border);border-radius:var(--radius)}"
        ].join("\n"),
        "qr-share-css"
      );

      function openQrModal() {
        try {
          var link = "";
          try {
            link = MS.makeShareLink();
          } catch (e) {
            console.error("[qr-share] makeShareLink failed", e);
            MS.toast("Could not build a shareable link");
            return;
          }

          var node = document.createElement("div");
          node.className = "qrs-wrap";

          var canvasBox = document.createElement("div");
          canvasBox.className = "qrs-canvas-box";
          canvasBox.id = "qrs-canvas-box";
          node.appendChild(canvasBox);

          // Warn about very long links (QR gets dense / may fail to encode).
          var isHuge = link.length > 900;
          if (link.length > 600) {
            var warn = document.createElement("div");
            warn.className = "qrs-warn";
            warn.textContent = isHuge
              ? "This link is very long (" + link.length +
                " chars). It may not fit in a QR code — the link text below is still copyable."
              : "This is a long link (" + link.length +
                " chars); the QR code is dense. Scan up close or just copy the link.";
            node.appendChild(warn);
          }

          var link_area = document.createElement("textarea");
          link_area.className = "ms-textarea qrs-link";
          link_area.id = "qrs-link";
          link_area.readOnly = true;
          link_area.value = link;
          node.appendChild(link_area);

          var meta = document.createElement("div");
          meta.className = "qrs-meta";
          meta.id = "qrs-meta";
          node.appendChild(meta);

          var row = document.createElement("div");
          row.className = "ms-btn-row";

          var copyBtn = document.createElement("button");
          copyBtn.className = "ms-btn ms-btn--primary";
          copyBtn.id = "qrs-copy";
          copyBtn.type = "button";
          copyBtn.textContent = "Copy link";
          copyBtn.addEventListener("click", function () {
            try {
              var p = MS.copyText(link);
              if (p && typeof p.then === "function") {
                p.then(function () { MS.toast("Link copied"); })
                 .catch(function () { MS.toast("Copy failed"); });
              } else {
                MS.toast("Link copied");
              }
            } catch (e) {
              console.error("[qr-share] copy failed", e);
              MS.toast("Copy failed");
            }
          });
          row.appendChild(copyBtn);

          var openBtn = document.createElement("button");
          openBtn.className = "ms-btn";
          openBtn.id = "qrs-open";
          openBtn.type = "button";
          openBtn.textContent = "Open link";
          openBtn.addEventListener("click", function () {
            try { window.open(link, "_blank", "noopener"); }
            catch (e) { console.error("[qr-share] open failed", e); }
          });
          row.appendChild(openBtn);

          node.appendChild(row);

          MS.openModal({
            title: "QR Share Code",
            node: node,
            width: "420px",
            onMount: function (body) {
              try {
                var box = body.querySelector("#qrs-canvas-box");
                var metaEl = body.querySelector("#qrs-meta");
                var result = QR.encode(link);
                var canvas = document.createElement("canvas");
                canvas.setAttribute("role", "img");
                canvas.setAttribute("aria-label", "QR code for shareable diagram link");
                drawToCanvas(canvas, result, { px: 280 });
                box.appendChild(canvas);
                if (metaEl) {
                  metaEl.textContent =
                    "QR version " + result.version + " • " + result.byteLen +
                    " bytes • scan to open this diagram";
                }
              } catch (encErr) {
                console.error("[qr-share] encode/draw failed", encErr);
                var box2 = body.querySelector("#qrs-canvas-box");
                if (box2) {
                  var fb = document.createElement("div");
                  fb.className = "qrs-fallback";
                  fb.textContent =
                    "The link is too large to render as a QR code. " +
                    "Use the Copy link button below to share it instead.";
                  box2.appendChild(fb);
                }
              }
            }
          });
        } catch (e) {
          console.error("[qr-share] openQrModal failed", e);
          MS.toast("Could not open QR share");
        }
      }

      MS.addTopbarButton({
        id: "qrShareBtn",
        title: "QR Share Code",
        label: "QR",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M20 14v.01M17 20h.01M20 17v4"/></svg>',
        onClick: openQrModal
      });

      MS.registerCommand({
        id: "qr-share.open",
        title: "QR Share: Show QR code of share link",
        run: openQrModal
      });
    } catch (e) {
      console.error("[qr-share] setup failed", e);
    }
  });
})();
