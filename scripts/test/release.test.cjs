'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { prepareChangelog, validatePackage, validateRelease } = require('../release.cjs');

const CHANGELOG =
  '# Change Log\n\n## [Unreleased]\n\n### Added\n\n- Pending work.\n\n## [1.0.0] - 2026-01-01\n';

test('should move pending notes into a dated release and preserve older entries', () => {
  assert.equal(
    prepareChangelog(CHANGELOG.replace(/\n/g, '\r\n'), '1.0.1', '2026-10-15'),
    CHANGELOG.replace('## [Unreleased]', '## [Unreleased]\n\n## [1.0.1] - 2026-10-15'),
  );
});

test('should reject missing, duplicate, or empty Unreleased sections', () => {
  for (const content of [
    CHANGELOG.replace('## [Unreleased]', ''),
    CHANGELOG.replace('### Added', '## [Unreleased]'),
    CHANGELOG.replace('- Pending work.', ''),
  ]) {
    assert.throws(() => prepareChangelog(content, '1.0.1', '2026-10-15'));
  }
});

test('should reject duplicate releases, unstable versions, and invalid dates', () => {
  assert.throws(() => prepareChangelog(CHANGELOG, '1.0.0', '2026-10-15'));
  assert.throws(() => prepareChangelog(CHANGELOG, '1.0.1-beta.1', '2026-10-15'));
  assert.throws(() => prepareChangelog(CHANGELOG, '01.0.1', '2026-10-15'));
  assert.throws(() => prepareChangelog(CHANGELOG, '1.0.1', '2026-02-30'));
});

test('should accept a release only when tag, package, lockfile, and changelog agree', () => {
  const manifest = { version: '1.0.0' };
  const lockfile = { version: '1.0.0', packages: { '': { version: '1.0.0' } } };
  assert.doesNotThrow(() => validateRelease('v1.0.0', manifest, lockfile, CHANGELOG));
  for (const tag of ['v1.0.1', 'v1.0.0_deadbeef', 'main', undefined]) {
    assert.throws(() => validateRelease(tag, manifest, lockfile, CHANGELOG));
  }
  assert.throws(() =>
    validateRelease('v1.0.0', manifest, { ...lockfile, version: '0.9.0' }, CHANGELOG),
  );
  assert.throws(() =>
    validateRelease(
      'v1.0.0',
      manifest,
      { ...lockfile, packages: { '': { version: '0.9.0' } } },
      CHANGELOG,
    ),
  );
  assert.throws(() => validateRelease('v1.0.0', manifest, lockfile, '## [1.0.0]\n'));
});

test('should verify npm runtime assets and reject missing or unexpected packed files', () => {
  const manifest = { name: 'barrel-roll', version: '1.0.0' };
  const files = [
    'LICENSE',
    'README.md',
    'dist/extension.js',
    'package.json',
    'public/img/barrel-roll-icon.png',
  ].map((path) => ({ path, size: 1 }));
  const packed = { ...manifest, files };
  assert.doesNotThrow(() => validatePackage([packed], manifest));
  assert.throws(() => validatePackage([{ ...packed, files: files.slice(1) }], manifest));
  assert.throws(() =>
    validatePackage(
      [{ ...packed, files: [...files, { path: 'src/extension.ts', size: 1 }] }],
      manifest,
    ),
  );
  assert.throws(() => validatePackage([{ ...packed, name: 'another-package' }], manifest));
  assert.throws(() => validatePackage([{ ...packed, version: '0.9.0' }], manifest));
  assert.throws(() =>
    validatePackage([{ ...packed, files: files.map((file) => ({ ...file, size: 0 })) }], manifest),
  );
  assert.throws(() => validatePackage([], manifest));
});
