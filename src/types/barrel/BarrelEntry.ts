import { BarrelEntryKind } from './BarrelEntryKind';
import { BarrelExport } from './BarrelExport';

/**
 * Represents an entry in a barrel, which can be either a file with exports or a directory.
 */
export type BarrelEntry =
  | {
      kind: BarrelEntryKind.File;
      exports: BarrelExport[];
    }
  | {
      kind: BarrelEntryKind.Directory;
    };
