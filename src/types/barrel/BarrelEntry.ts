import { BarrelEntryKind } from './BarrelEntryKind';
import { BarrelExport } from './BarrelExport';

export type BarrelEntry =
  | {
      kind: BarrelEntryKind.File;
      exports: BarrelExport[];
    }
  | {
      kind: BarrelEntryKind.Directory;
    };
