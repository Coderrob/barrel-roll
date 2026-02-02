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

/**
 * Defines the kinds of exports that can be present in a barrel file.
 */
export enum BarrelExportKind {
  Value = 'value',
  Type = 'type',
  Default = 'default',
}

/**
 * Defines the modes for generating barrel files.
 */
export enum BarrelGenerationMode {
  CreateOrUpdate = 'createOrUpdate',
  UpdateExisting = 'updateExisting',
}

/**
 * Defines the kinds of entries that can exist within a barrel.
 */
export enum BarrelEntryKind {
  File = 'file',
  Directory = 'directory',
}

/**
 * Options for generating barrel files.
 */
export interface IBarrelGenerationOptions {
  recursive?: boolean;
  mode?: BarrelGenerationMode;
}

/**
 * Represents a parsed export statement with its name and whether it is type-only.
 */
export interface IParsedExport {
  name: string;
  typeOnly: boolean;
}

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

/**
 * Normalized options for generating barrel files, with all properties required.
 */
export type NormalizedBarrelGenerationOptions = Required<IBarrelGenerationOptions>;
