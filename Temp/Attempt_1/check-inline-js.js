// check-inline-js.js — syntax-check inline <script> blocks in a single-file HTML app.
// Replaces `node --check index.html`, which fails on Node 24 (Unknown file extension ".html")
// and never validated HTML on older Node either. Compiles (does not run) the inline JS,
// so undefined browser globals (document, supabase, ...) are fine — only syntax is checked.
//
// Usage:  node check-inline-js.js index.html
// Exit:   0 = all inline blocks OK, 1 = syntax error, 2 = no inline blocks found / read error.

const fs = require('fs');
const vm = require('vm');

const file = process.argv[2] || 'index.html';

let html;
try {
  html = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error('Cannot read ' + file + ': ' + e.message);
  process.exit(2);
}

// Match inline <script> ... </script> blocks, skipping any with a src= attribute.
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

if (!blocks.length) {
  console.error('No inline <script> blocks found in ' + file);
  process.exit(2);
}

let ok = true;
blocks.forEach((m, i) => {
  try {
    new vm.Script(m[1], { filename: file + '#inline' + (i + 1) });
    console.log('inline block ' + (i + 1) + ': OK');
  } catch (e) {
    ok = false;
    console.error('inline block ' + (i + 1) + ': SYNTAX ERROR — ' + e.message);
  }
});

console.log(ok ? 'PASS — inline JS syntax valid' : 'FAIL — fix the error(s) above');
process.exit(ok ? 0 : 1);
