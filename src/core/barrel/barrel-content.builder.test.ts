/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeEach, describe, expect, it } from '../../test-utils/testHarness.js';

import { BarrelContentBuilder } from './barrel-content.builder.js';
import { BarrelEntry, BarrelEntryKind, BarrelExportKind } from '../../types/index.js';

describe('BarrelContentBuilder', () => {
  let builder: BarrelContentBuilder;

  beforeEach(() => {
    builder = new BarrelContentBuilder();
  });

  describe('buildContent', () => {
    it('should build export statements for files and nested directories', () => {
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

      const source = builder.buildContent(entries, '');

      expect(source).toBe(
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
      it(`should build expected output ${index}`, () => {
        const result = builder.buildContent(entries, '');

        expect(result.trim()).toBe(expected);
      });
    }

    it('should build output for legacy entry arrays', () => {
      const entries = new Map<string, string[]>([['delta.ts', ['Delta', 'default']]]);

      const result = builder.buildContent(entries, '');

      expect(result.trim()).toBe(
        "export { Delta } from './delta';\nexport { default } from './delta';",
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
      it(`should ignore parent-directory entries ${index}`, () => {
        const result = builder.buildContent(entries, '');

        expect(result).toBe('\n');
      });
    }
  });
});
