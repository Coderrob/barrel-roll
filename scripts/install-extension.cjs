#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
const vsixPath = path.join(__dirname, '..', `barrel-roll-${version}.vsix`);

try {
  execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
  console.log('Extension installed successfully.');
} catch (error) {
  console.error('Failed to install extension:', error.message);
  process.exit(1);
}
