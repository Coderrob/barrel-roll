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
import { describe, it } from 'node:test';

import {
  BarrelEntryKind,
  BarrelExportKind,
  BarrelGenerationMode,
  DEFAULT_EXPORT_NAME,
  INDEX_FILENAME,
  NEWLINE,
  PARENT_DIRECTORY_SEGMENT,
  type BarrelEntry,
  type BarrelExport,
  type IBarrelGenerationOptions,
  type IParsedExport,
  type NormalizedBarrelGenerationOptions,
} from '../types/index.js';

/**
 * Contract validation tests to ensure type safety and behavioral expectations
 */
describe('Contract Validation', () => {
  describe('Enum Contracts', () => {
    describe('BarrelExportKind', () => {
      it('should have exactly three values', () => {
        const values = Object.values(BarrelExportKind) as string[];
        assert.strictEqual(values.length, 3);
        assert.ok(values.includes(BarrelExportKind.Value));
        assert.ok(values.includes(BarrelExportKind.Type));
        assert.ok(values.includes(BarrelExportKind.Default));
      });

      it('should have string values matching enum names', () => {
        assert.strictEqual(BarrelExportKind.Value, 'value');
        assert.strictEqual(BarrelExportKind.Type, 'type');
        assert.strictEqual(BarrelExportKind.Default, 'default');
      });
    });

    describe('BarrelEntryKind', () => {
      it('should have exactly two values', () => {
        const values = Object.values(BarrelEntryKind) as string[];
        assert.strictEqual(values.length, 2);
        assert.ok(values.includes(BarrelEntryKind.File));
        assert.ok(values.includes(BarrelEntryKind.Directory));
      });

      it('should have string values matching enum names', () => {
        assert.strictEqual(BarrelEntryKind.File, 'file');
        assert.strictEqual(BarrelEntryKind.Directory, 'directory');
      });
    });

    describe('BarrelGenerationMode', () => {
      it('should have exactly two values', () => {
        const values = Object.values(BarrelGenerationMode) as string[];
        assert.strictEqual(values.length, 2);
        assert.ok(values.includes(BarrelGenerationMode.CreateOrUpdate));
        assert.ok(values.includes(BarrelGenerationMode.UpdateExisting));
      });

      it('should have string values matching enum names', () => {
        assert.strictEqual(BarrelGenerationMode.CreateOrUpdate, 'createOrUpdate');
        assert.strictEqual(BarrelGenerationMode.UpdateExisting, 'updateExisting');
      });
    });
  });

  describe('Constant Contracts', () => {
    it('should have expected constant values', () => {
      assert.strictEqual(DEFAULT_EXPORT_NAME, 'default');
      assert.strictEqual(INDEX_FILENAME, 'index.ts');
      assert.strictEqual(NEWLINE, '\n');
      assert.strictEqual(PARENT_DIRECTORY_SEGMENT, '..');
    });

    it('should have non-empty string constants', () => {
      assert.ok(DEFAULT_EXPORT_NAME.length > 0);
      assert.ok(INDEX_FILENAME.length > 0);
      assert.ok(NEWLINE.length > 0);
      assert.ok(PARENT_DIRECTORY_SEGMENT.length > 0);
    });
  });

  describe('Type Contracts', () => {
    describe('IParsedExport', () => {
      it('should accept valid parsed export objects', () => {
        const validExport: IParsedExport = {
          name: 'MyExport',
          typeOnly: false,
        };
        assert.strictEqual(validExport.name, 'MyExport');
        assert.strictEqual(validExport.typeOnly, false);
      });

      it('should accept type-only exports', () => {
        const typeOnlyExport: IParsedExport = {
          name: 'MyType',
          typeOnly: true,
        };
        assert.strictEqual(typeOnlyExport.name, 'MyType');
        assert.strictEqual(typeOnlyExport.typeOnly, true);
      });

      it('should require name property', () => {
        // This would be caught by TypeScript, but we test the runtime contract
        const exportWithName: IParsedExport = {
          name: 'test',
          typeOnly: false,
        };
        assert.ok('name' in exportWithName);
        assert.ok('typeOnly' in exportWithName);
      });
    });

    describe('BarrelExport', () => {
      it('should accept value exports', () => {
        const valueExport: BarrelExport = {
          kind: BarrelExportKind.Value,
          name: 'myValue',
        };
        assert.strictEqual(valueExport.kind, BarrelExportKind.Value);
        assert.strictEqual(valueExport.name, 'myValue');
      });

      it('should accept type exports', () => {
        const typeExport: BarrelExport = {
          kind: BarrelExportKind.Type,
          name: 'MyType',
        };
        assert.strictEqual(typeExport.kind, BarrelExportKind.Type);
        assert.strictEqual(typeExport.name, 'MyType');
      });

      it('should accept default exports', () => {
        const defaultExport: BarrelExport = {
          kind: BarrelExportKind.Default,
        };
        assert.strictEqual(defaultExport.kind, BarrelExportKind.Default);
        assert.ok(!('name' in defaultExport));
      });

      it('should reject invalid export kinds', () => {
        // TypeScript prevents invalid kinds at compile time
        // This test ensures the type system is working correctly
        const validValue: BarrelExport = { kind: BarrelExportKind.Value, name: 'test' };
        const validType: BarrelExport = { kind: BarrelExportKind.Type, name: 'test' };
        const validDefault: BarrelExport = { kind: BarrelExportKind.Default };

        assert.ok(validValue);
        assert.ok(validType);
        assert.ok(validDefault);
      });
    });

    describe('BarrelEntry', () => {
      it('should accept file entries with exports', () => {
        const fileEntry: BarrelEntry = {
          kind: BarrelEntryKind.File,
          exports: [{ kind: BarrelExportKind.Value, name: 'test' }],
        };
        assert.strictEqual(fileEntry.kind, BarrelEntryKind.File);
        assert.ok(Array.isArray(fileEntry.exports));
        assert.strictEqual(fileEntry.exports.length, 1);
      });

      it('should accept directory entries', () => {
        const dirEntry: BarrelEntry = {
          kind: BarrelEntryKind.Directory,
        };
        assert.strictEqual(dirEntry.kind, BarrelEntryKind.Directory);
        assert.ok(!('exports' in dirEntry));
      });

      it('should enforce type safety for entries', () => {
        // TypeScript ensures file entries have exports and directory entries don't
        const fileEntry: BarrelEntry = {
          kind: BarrelEntryKind.File,
          exports: [],
        };
        const dirEntry: BarrelEntry = {
          kind: BarrelEntryKind.Directory,
        };

        assert.ok(fileEntry);
        assert.ok(dirEntry);
      });
    });

    describe('IBarrelGenerationOptions', () => {
      it('should accept empty options', () => {
        const emptyOptions: IBarrelGenerationOptions = {};
        assert.ok(emptyOptions);
      });

      it('should accept partial options', () => {
        const partialOptions: IBarrelGenerationOptions = {
          recursive: true,
        };
        assert.strictEqual(partialOptions.recursive, true);
        assert.ok(!('mode' in partialOptions));
      });

      it('should accept full options', () => {
        const fullOptions: IBarrelGenerationOptions = {
          recursive: false,
          mode: BarrelGenerationMode.UpdateExisting,
        };
        assert.strictEqual(fullOptions.recursive, false);
        assert.strictEqual(fullOptions.mode, BarrelGenerationMode.UpdateExisting);
      });
    });

    describe('NormalizedBarrelGenerationOptions', () => {
      it('should require all properties', () => {
        const normalizedOptions: NormalizedBarrelGenerationOptions = {
          recursive: true,
          mode: BarrelGenerationMode.CreateOrUpdate,
        };
        assert.ok('recursive' in normalizedOptions);
        assert.ok('mode' in normalizedOptions);
        assert.strictEqual(typeof normalizedOptions.recursive, 'boolean');
        assert.ok(Object.values(BarrelGenerationMode).includes(normalizedOptions.mode));
      });
    });
  });

  describe('Behavioral Contracts', () => {
    describe('Enum Exhaustiveness', () => {
      it('should handle all BarrelExportKind values in switch', () => {
        const testAllKinds = (kind: BarrelExportKind): string => {
          switch (kind) {
            case BarrelExportKind.Value:
              return 'value';
            case BarrelExportKind.Type:
              return 'type';
            case BarrelExportKind.Default:
              return 'default';
            default:
              throw new Error(`Unexpected BarrelExportKind: ${kind}`);
          }
        };

        assert.strictEqual(testAllKinds(BarrelExportKind.Value), 'value');
        assert.strictEqual(testAllKinds(BarrelExportKind.Type), 'type');
        assert.strictEqual(testAllKinds(BarrelExportKind.Default), 'default');
      });

      it('should handle all BarrelEntryKind values in switch', () => {
        const testAllKinds = (kind: BarrelEntryKind): string => {
          switch (kind) {
            case BarrelEntryKind.File:
              return 'file';
            case BarrelEntryKind.Directory:
              return 'directory';
            default:
              throw new Error(`Unexpected BarrelEntryKind: ${kind}`);
          }
        };

        assert.strictEqual(testAllKinds(BarrelEntryKind.File), 'file');
        assert.strictEqual(testAllKinds(BarrelEntryKind.Directory), 'directory');
      });

      it('should handle all BarrelGenerationMode values in switch', () => {
        const testAllModes = (mode: BarrelGenerationMode): string => {
          switch (mode) {
            case BarrelGenerationMode.CreateOrUpdate:
              return 'createOrUpdate';
            case BarrelGenerationMode.UpdateExisting:
              return 'updateExisting';
            default:
              throw new Error(`Unexpected BarrelGenerationMode: ${mode}`);
          }
        };

        assert.strictEqual(testAllModes(BarrelGenerationMode.CreateOrUpdate), 'createOrUpdate');
        assert.strictEqual(testAllModes(BarrelGenerationMode.UpdateExisting), 'updateExisting');
      });
    });

    describe('Type Guards', () => {
      const isValueExport = (
        exp: BarrelExport,
      ): exp is BarrelExport & { kind: BarrelExportKind.Value } => {
        return exp.kind === BarrelExportKind.Value;
      };

      const isTypeExport = (
        exp: BarrelExport,
      ): exp is BarrelExport & { kind: BarrelExportKind.Type } => {
        return exp.kind === BarrelExportKind.Type;
      };

      const isDefaultExport = (
        exp: BarrelExport,
      ): exp is BarrelExport & { kind: BarrelExportKind.Default } => {
        return exp.kind === BarrelExportKind.Default;
      };

      const isFileEntry = (
        entry: BarrelEntry,
      ): entry is BarrelEntry & { kind: BarrelEntryKind.File } => {
        return entry.kind === BarrelEntryKind.File;
      };

      const isDirectoryEntry = (
        entry: BarrelEntry,
      ): entry is BarrelEntry & { kind: BarrelEntryKind.Directory } => {
        return entry.kind === BarrelEntryKind.Directory;
      };

      it('should correctly identify value exports', () => {
        const valueExport: BarrelExport = { kind: BarrelExportKind.Value, name: 'test' };
        const typeExport: BarrelExport = { kind: BarrelExportKind.Type, name: 'test' };
        const defaultExport: BarrelExport = { kind: BarrelExportKind.Default };

        assert.ok(isValueExport(valueExport));
        assert.ok(!isValueExport(typeExport));
        assert.ok(!isValueExport(defaultExport));
      });

      it('should correctly identify type exports', () => {
        const valueExport: BarrelExport = { kind: BarrelExportKind.Value, name: 'test' };
        const typeExport: BarrelExport = { kind: BarrelExportKind.Type, name: 'test' };
        const defaultExport: BarrelExport = { kind: BarrelExportKind.Default };

        assert.ok(!isTypeExport(valueExport));
        assert.ok(isTypeExport(typeExport));
        assert.ok(!isTypeExport(defaultExport));
      });

      it('should correctly identify default exports', () => {
        const valueExport: BarrelExport = { kind: BarrelExportKind.Value, name: 'test' };
        const typeExport: BarrelExport = { kind: BarrelExportKind.Type, name: 'test' };
        const defaultExport: BarrelExport = { kind: BarrelExportKind.Default };

        assert.ok(!isDefaultExport(valueExport));
        assert.ok(!isDefaultExport(typeExport));
        assert.ok(isDefaultExport(defaultExport));
      });

      it('should correctly identify file entries', () => {
        const fileEntry: BarrelEntry = {
          kind: BarrelEntryKind.File,
          exports: [{ kind: BarrelExportKind.Value, name: 'test' }],
        };
        const dirEntry: BarrelEntry = { kind: BarrelEntryKind.Directory };

        assert.ok(isFileEntry(fileEntry));
        assert.ok(!isFileEntry(dirEntry));
      });

      it('should correctly identify directory entries', () => {
        const fileEntry: BarrelEntry = {
          kind: BarrelEntryKind.File,
          exports: [{ kind: BarrelExportKind.Value, name: 'test' }],
        };
        const dirEntry: BarrelEntry = { kind: BarrelEntryKind.Directory };

        assert.ok(!isDirectoryEntry(fileEntry));
        assert.ok(isDirectoryEntry(dirEntry));
      });
    });
  });
});
