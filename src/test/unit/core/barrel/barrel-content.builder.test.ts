/*
 * Copyright 2025 Robert Lindley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { BarrelContentBuilder } from '../../../../core/barrel/barrel-content.builder.js';
import { BarrelEntry, BarrelEntryKind, BarrelExportKind } from '../../../../types/index.js';

describe('BarrelContentBuilder', () => {
  let builder: BarrelContentBuilder;

  beforeEach(() => {
    builder = new BarrelContentBuilder();
  });

  describe('buildContent', () => {
    it('should build export statements for files and nested directories', async () => {
      const entries = new Map<string, BarrelEntry>();

      entries
        .set('alpha.ts', {
          kind: BarrelEntryKind.File,
          exports: [{ kind: BarrelExportKind.Value, name: 'Alpha' }],
        })
        .set('beta.ts', {
          kind: BarrelEntryKind.File,
          exports: [
            { kind: BarrelExportKind.Type, name: 'Bravo' },
            { kind: BarrelExportKind.Default },
          ],
        })
        .set('nested', { kind: BarrelEntryKind.Directory });

      const source = await builder.buildContent(entries, '');

      assert.strictEqual(
        source,
        [
          "export { Alpha } from './alpha';",
          "export type { Bravo } from './beta';",
          "export { default } from './beta';",
          "export * from './nested';",
          '',
        ].join('\n'),
      );
    });

    // Table-driven tests omit per-case descriptions; add standalone tests when a case needs custom messaging.
    const buildContentCases: Array<{ entries: Map<string, BarrelEntry>; expected: string }> = [
      {
        entries: new Map<string, BarrelEntry>([
          [
            'gamma.ts',
            {
              kind: BarrelEntryKind.File,
              exports: [{ kind: BarrelExportKind.Value, name: 'Gamma' }],
            },
          ],
        ]),
        expected: "export { Gamma } from './gamma';",
      },
      {
        entries: new Map<string, BarrelEntry>([
          [
            'types.ts',
            {
              kind: BarrelEntryKind.File,
              exports: [{ kind: BarrelExportKind.Type, name: 'Types' }],
            },
          ],
        ]),
        expected: "export type { Types } from './types';",
      },
    ];

    for (const [index, { entries, expected }] of buildContentCases.entries()) {
      it(`should build expected output ${index}`, async () => {
        const result = await builder.buildContent(entries, '');

        assert.strictEqual(result.trim(), expected);
      });
    }

    it('should build output for legacy entry arrays', async () => {
      const entries = new Map<string, string[]>([['delta.ts', ['Delta', 'default']]]);

      const result = await builder.buildContent(entries, '');

      assert.strictEqual(
        result.trim(),
        "export { Delta } from './delta';\nexport { default } from './delta';",
      );
    });

    it('should ignore undefined entries produced by legacy callers', async () => {
      const entries = new Map<string, BarrelEntry>();
      entries.set('ghost.ts', undefined as unknown as BarrelEntry);
      entries.set('echo.ts', {
        kind: BarrelEntryKind.File,
        exports: [{ kind: BarrelExportKind.Value, name: 'Echo' }],
      });

      const result = await builder.buildContent(entries, '');

      assert.strictEqual(result.trim(), "export { Echo } from './echo';");
    });

    it('should combine value and type exports using mixed export syntax', async () => {
      const entries = new Map<string, BarrelEntry>();
      entries.set('mixed.ts', {
        kind: BarrelEntryKind.File,
        exports: [
          { kind: BarrelExportKind.Value, name: 'Something' },
          { kind: BarrelExportKind.Type, name: 'OtherThing' },
          { kind: BarrelExportKind.Value, name: 'AnotherValue' },
          { kind: BarrelExportKind.Type, name: 'AnotherType' },
        ],
      });

      const result = await builder.buildContent(entries, '');

      // Should use TypeScript 4.5+ mixed export syntax
      assert.strictEqual(
        result.trim(),
        "export { AnotherValue, Something, type AnotherType, type OtherThing } from './mixed';",
      );
    });

    const parentDirectoryCases: Array<Map<string, BarrelEntry>> = [
      new Map<string, BarrelEntry>([['../outside', { kind: BarrelEntryKind.Directory }]]),
      new Map<string, BarrelEntry>([
        [
          '../outside.ts',
          {
            kind: BarrelEntryKind.File,
            exports: [{ kind: BarrelExportKind.Value, name: '../Outside' }],
          },
        ],
      ]),
    ];

    for (const [index, entries] of parentDirectoryCases.entries()) {
      it(`should ignore parent-directory entries ${index}`, async () => {
        const result = await builder.buildContent(entries, '');

        assert.strictEqual(result, '\n');
      });
    }
  });
});
