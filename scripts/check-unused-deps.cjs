#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', '.depcheck.json');
if (!fs.existsSync(file)) {
  console.error('depcheck result not found. Run `npm run deps:check` to generate it.');
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let unusedDeps = data.dependencies || [];
let unusedDevDeps = data.devDependencies || [];

// Treat packages referenced in package.json scripts or config files as used
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const scriptsText = Object.values(pkg.scripts || {}).join(' ');

// Collect content from common config files to detect package references
function readRepoText() {
  const root = path.join(__dirname, '..');
  const exclude = new Set(['node_modules', '.git', 'dist', 'coverage', 'public']);
  const exts = new Set(['.js', '.mjs', '.cjs', '.json', '.ts']);
  const files = [];

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!exclude.has(name)) walk(full);
        continue;
      }
      const ext = path.extname(name);
      if (exts.has(ext) || name === 'eslint.config.mjs') files.push(full);
    }
  }

  walk(root);
  return files
    .map((f) => {
      try {
        return fs.readFileSync(f, 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

const repoText = readRepoText();
function filterReferenced(pkgs) {
  return pkgs.filter((p) => !(scriptsText.includes(p) || repoText.includes(p)));
}

unusedDeps = filterReferenced(unusedDeps);
unusedDevDeps = filterReferenced(unusedDevDeps);

if ((unusedDeps && unusedDeps.length > 0) || (unusedDevDeps && unusedDevDeps.length > 0)) {
  console.error('Unused dependencies found:');
  if (unusedDeps.length > 0) {
    console.error('  dependencies:', unusedDeps.join(', '));
  }
  if (unusedDevDeps.length > 0) {
    console.error('  devDependencies:', unusedDevDeps.join(', '));
  }
  console.error(
    '\nPlease remove unused dependencies (npm uninstall <pkg>) or update package.json as appropriate.',
  );
  process.exit(1);
}

console.log('No unused dependencies detected.');
process.exit(0);
