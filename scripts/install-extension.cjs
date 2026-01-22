#!/usr/bin/env node

const { execSync } = require('node:child_process');
const path = require('node:path');

const vsixPath = path.join(__dirname, '..', 'barrel-roll-0.0.1.vsix');

try {
  execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
  console.log('Extension installed successfully.');
} catch (error) {
  console.error('Failed to install extension:', error.message);
  process.exit(1);
}
