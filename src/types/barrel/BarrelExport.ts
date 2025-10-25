import { BarrelExportKind } from './BarrelExportKind';

/**
 * Represents an export within a barrel, which can be a value export, type export, or default export.
 */
export type BarrelExport =
  | {
      kind: BarrelExportKind.Value;
      name: string;
    }
  | {
      kind: BarrelExportKind.Type;
      name: string;
    }
  | {
      kind: BarrelExportKind.Default;
    };
