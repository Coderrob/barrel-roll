#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const depcheck = require('depcheck');

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function readRepoText() {
  const root = process.cwd();
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

console.log('Running depcheck...');

depcheck(process.cwd(), {}, (result) => {
  fs.writeFileSync(path.join(process.cwd(), '.depcheck.json'), JSON.stringify(result, null, 2));

  const unusedDeps = result.dependencies || [];
  const unusedDevDeps = result.devDependencies || [];

  const scriptsText = Object.values(pkg.scripts || {}).join(' ');
  const repoText = readRepoText();

  function filterReferenced(pkgs) {
    return pkgs.filter((p) => !(scriptsText.includes(p) || repoText.includes(p)));
  }

  const leftoverDeps = filterReferenced(unusedDeps);
  const leftoverDevDeps = filterReferenced(unusedDevDeps);

  if (leftoverDeps.length > 0 || leftoverDevDeps.length > 0) {
    console.error('Unused dependencies found:');
    if (leftoverDeps.length > 0) {
      console.error('  dependencies:', leftoverDeps.join(', '));
    }
    if (leftoverDevDeps.length > 0) {
      console.error('  devDependencies:', leftoverDevDeps.join(', '));
    }
    console.error(
      '\nPlease remove unused dependencies (npm uninstall <pkg>) or update package.json as appropriate.',
    );
    process.exit(1);
  }

  console.log('No unused dependencies detected.');
  process.exit(0);
});
