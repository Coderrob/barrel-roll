import { BarrelExportKind } from './BarrelExportKind';

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
