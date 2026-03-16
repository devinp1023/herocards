#!/usr/bin/env node
// build.js — concatenates src/ files into index.html
// Usage: node build.js
// Add new source files to the SOURCES array in order.

const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// Source JS files — concatenated in this order inside <script type="text/babel">
const SOURCES = [
  'src/data.js',
  'src/components.js',
  'src/game.js',
  'src/battle-engine.js',
  // Future: 'src/battle-ui.js',
];

const shell = fs.readFileSync(path.join(BASE, 'src/shell.html'), 'utf8');

const scriptContent = SOURCES.map(f => {
  const full = path.join(BASE, f);
  if (!fs.existsSync(full)) { console.error('Missing:', full); process.exit(1); }
  return `/* ── ${f} ── */\n` + fs.readFileSync(full, 'utf8');
}).join('\n');

const output = shell.replace(
  '<!-- BUILD_INJECT_SCRIPT -->',
  `<script type="text/babel">\n${scriptContent}\n</script>`
);

fs.writeFileSync(path.join(BASE, 'index.html'), output);

const kb = (fs.statSync(path.join(BASE, 'index.html')).size / 1024).toFixed(1);
console.log(`✓ index.html rebuilt — ${kb} KB`);
SOURCES.forEach(f => {
  const lines = fs.readFileSync(path.join(BASE, f), 'utf8').split('\n').length;
  console.log(`  ${f.padEnd(30)} ${lines} lines`);
});
