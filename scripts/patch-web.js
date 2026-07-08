#!/usr/bin/env node
/**
 * patch-web.js  — run after `expo export --platform web`
 *
 * Expo 54 (Metro bundler) bakes `body { overflow: hidden }` into the
 * generated dist/index.html via the "expo-reset" style block.
 *
 * React Navigation also renders each screen with:
 *   style="position: absolute; overflow: hidden; top: 0; left: 0; right: 0; bottom: 0;"
 *
 * Both of these prevent scrolling. This script patches both issues.
 */

const fs = require('fs');
const path = require('path');

// Always resolve relative to the project root (parent of scripts/)
const projectRoot = path.resolve(__dirname, '..');
const indexPath = path.join(projectRoot, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('patch-web.js: dist/index.html not found — run `expo export --platform web` first');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

// ─── PATCH 1: Replace expo-reset style block ─────────────────────────────────
const OLD_RESET = `<style id="expo-reset">
      /* These styles make the body full-height */
      html,
      body {
        height: 100%;
      }
      /* These styles disable body scrolling if you are using <ScrollView> */
      body {
        overflow: hidden;
      }
      /* These styles make the root element full-height */
      #root {
        display: flex;
        height: 100%;
        flex: 1;
      }
    </style>`;

const NEW_RESET = `<style id="expo-reset">
      /* ── FitFusion web scroll fix ── */
      html {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      body {
        height: 100%;
        margin: 0;
        overflow-y: auto;
        overflow-x: hidden;
      }
      #root {
        display: flex;
        min-height: 100%;
        flex: 1;
        flex-direction: column;
        overflow-y: auto;
      }
    </style>`;

if (html.includes(OLD_RESET)) {
  html = html.replace(OLD_RESET, NEW_RESET);
  console.log('patch-web.js: ✅ PATCH 1 — expo-reset overflow:hidden → overflow:auto');
} else if (html.includes('overflow: hidden')) {
  html = html.replace(/body\s*\{\s*overflow:\s*hidden;\s*\}/g, 'body { overflow-y: auto; overflow-x: hidden; }');
  console.log('patch-web.js: ✅ PATCH 1 — fallback body overflow:hidden → overflow:auto');
} else {
  console.log('patch-web.js: ℹ️  PATCH 1 — no overflow:hidden found in style block');
}

// ─── PATCH 2: Inject additional CSS to override React Navigation inline styles ─
// React Navigation renders each screen with:
//   position:absolute; overflow:hidden; top:0; left:0; right:0; bottom:0
// CSS `!important` overrides inline styles in all modern browsers.
// We target divs with BOTH position:absolute AND overflow:hidden to avoid
// breaking other elements that legitimately need overflow:hidden.
const SCROLL_FIX_CSS = `
    <style id="fitfusion-scroll-fix">
      /*
       * React Navigation Stack renders each screen as:
       *   position: absolute; overflow: hidden; top:0; left:0; right:0; bottom:0
       * We override overflow so that ScrollView children can scroll.
       * !important beats inline styles in all modern browsers.
       */

      /* The screen wrapper itself — switch from absolute to relative so it
         participates in normal document flow and the browser can scroll it */
      div[style*="position: absolute"][style*="overflow: hidden"] {
        position: relative !important;
        overflow: visible !important;
        min-height: 100vh;
      }

      /* GestureHandlerRootView and SafeAreaProvider — keep flex layout */
      #root > div,
      #root > div > div {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      /* Let react-native-web ScrollView scroll freely */
      div[style*="overflow: scroll"],
      div[style*="overflow-y: scroll"],
      div[style*="overflow: auto"],
      div[style*="overflow-y: auto"] {
        -webkit-overflow-scrolling: touch;
      }
    </style>`;

// Insert before closing </head>
if (html.includes('</head>')) {
  html = html.replace('</head>', SCROLL_FIX_CSS + '\n  </head>');
  console.log('patch-web.js: ✅ PATCH 2 — Injected React Navigation screen wrapper scroll fix');
} else {
  console.log('patch-web.js: ⚠️  PATCH 2 — Could not find </head> to inject CSS');
}

fs.writeFileSync(indexPath, html, 'utf-8');
console.log('patch-web.js: Done — dist/index.html updated');
