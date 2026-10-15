'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PACKAGE_FILES = [
  'LICENSE',
  'README.md',
  'dist/extension.js',
  'package.json',
  'public/img/barrel-roll-icon.png',
];

/** Move pending release notes into one dated stable-version section. */
function prepareChangelog(changelog, version, releaseDate) {
  assert.match(version, STABLE_VERSION, 'Expected a stable major.minor.patch version');
  assert.match(releaseDate, /^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD release date');
  assert.equal(new Date(`${releaseDate}T00:00:00Z`).toISOString().slice(0, 10), releaseDate);
  const normalized = changelog.replace(/\r\n/g, '\n');
  const heading = '## [Unreleased]';
  const start = normalized.indexOf(heading);
  const end = normalized.indexOf('\n## [', start + heading.length);
  assert.ok(start >= 0 && end > start, 'Expected Unreleased before existing releases');
  assert.equal(normalized.indexOf(heading, start + heading.length), -1, 'Duplicate Unreleased');
  assert.match(normalized.slice(start + heading.length, end), /^- /m, 'Unreleased notes are empty');
  assert.ok(!normalized.includes(`## [${version}]`), 'Release version already exists');
  return `${normalized.slice(0, start)}${heading}\n\n## [${version}] - ${releaseDate}${normalized.slice(start + heading.length)}`;
}

/** Require the release tag, both lockfile versions, and dated changelog to agree. */
function validateRelease(tag, manifest, lockfile, changelog) {
  assert.match(manifest.version, STABLE_VERSION, 'Expected a stable package version');
  assert.equal(tag, `v${manifest.version}`, 'Tag must match the package version exactly');
  assert.equal(lockfile.version, manifest.version, 'Lockfile version differs from package');
  assert.equal(lockfile.packages[''].version, manifest.version, 'Lockfile root version differs');
  const versionPattern = manifest.version.replace(/\./g, '\\.');
  assert.match(
    changelog,
    new RegExp(`^## \\[${versionPattern}\\] - \\d{4}-\\d{2}-\\d{2}\\r?$`, 'm'),
    'Expected a dated changelog section for this release',
  );
}

/** Reject missing runtime assets or unexpected development files in the npm tarball. */
function validatePackage(packages, manifest) {
  assert.equal(packages.length, 1, 'Expected exactly one packed package');
  const packed = packages[0];
  assert.equal(packed.name, manifest.name, 'Packed package name differs');
  assert.equal(packed.version, manifest.version, 'Packed package version differs');
  assert.deepEqual(
    packed.files.map((file) => file.path).sort(),
    [...PACKAGE_FILES].sort(),
    'npm package must contain exactly the documented release files',
  );
  assert.ok(
    packed.files.every((file) => file.size > 0),
    'Package assets must not be empty',
  );
}

/** Run release preparation and verification against files in the repository root. */
function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const read = (file) => readFileSync(path.join(projectRoot, file), 'utf8');
  const manifest = JSON.parse(read('package.json'));
  const command = process.argv[2];
  if (command === 'prepare-changelog') {
    const updated = prepareChangelog(
      read('CHANGELOG.md'),
      process.argv[3],
      new Date().toISOString().slice(0, 10),
    );
    writeFileSync(path.join(projectRoot, 'CHANGELOG.md'), updated);
  } else if (command === 'check-tag') {
    validateRelease(
      process.argv[3],
      manifest,
      JSON.parse(read('package-lock.json')),
      read('CHANGELOG.md'),
    );
  } else if (command === 'check-package') {
    assert.ok(process.env.npm_execpath, 'Run package validation with npm run npm:pack:check');
    const packed = execFileSync(
      process.execPath,
      [process.env.npm_execpath, 'pack', '--dry-run', '--ignore-scripts', '--json'],
      { cwd: projectRoot, encoding: 'utf8' },
    );
    validatePackage(JSON.parse(packed), manifest);
  } else {
    throw new Error(`Unknown release command: ${command}`);
  }
  console.log(`Release command passed: ${command}`);
}

module.exports = { prepareChangelog, validatePackage, validateRelease };

if (require.main === module) {
  main();
}
