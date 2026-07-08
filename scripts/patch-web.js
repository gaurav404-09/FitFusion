#!/usr/bin/env node
/**
 * patch-web.js  — run after `expo export --platform web`
 *
 * Expo 54 (Metro bundler) bakes `body { overflow: hidden }` into the
 * generated dist/index.html via the "expo-reset" style block. This
 * prevents browser-level scrolling on the web build.
 *
 * This script patches the generated file in-place to allow scrolling.
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

// Replace the expo-reset style block with a scroll-enabled version
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
      /* Allow browser-level scrolling on web — required for React Navigation */
      html {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      body {
        height: 100%;
        margin: 0;
        /* DO NOT set overflow: hidden — that traps scroll */
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
  console.log('patch-web.js: ✅ Patched expo-reset overflow:hidden → overflow:auto');
} else if (html.includes('overflow: hidden')) {
  // Fallback: replace any overflow:hidden in a style block
  html = html.replace(/body\s*\{\s*overflow:\s*hidden;\s*\}/g, 'body { overflow-y: auto; overflow-x: hidden; }');
  console.log('patch-web.js: ✅ Patched body overflow:hidden via fallback regex');
} else {
  console.log('patch-web.js: ℹ️  No overflow:hidden found — already patched or Expo changed the template');
}

fs.writeFileSync(indexPath, html, 'utf-8');
console.log('patch-web.js: Done — dist/index.html updated');
