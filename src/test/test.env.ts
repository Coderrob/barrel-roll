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

const ELECTRON_NODE_MODE_VARIABLE = 'ELECTRON_RUN_AS_NODE';

/**
 * Removes the parent extension host's Electron-as-Node setting before launching VS Code.
 * @returns The inherited value so the caller can restore it after the child exits.
 */
export function consumeElectronNodeMode(): string | undefined {
  const inheritedValue = process.env[ELECTRON_NODE_MODE_VARIABLE];
  Reflect.deleteProperty(process.env, ELECTRON_NODE_MODE_VARIABLE);
  return inheritedValue;
}

/**
 * Restores the parent extension host's Electron-as-Node setting.
 * @param value - Original environment variable value.
 */
export function restoreElectronNodeMode(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, ELECTRON_NODE_MODE_VARIABLE);
    return;
  }
  Reflect.set(process.env, ELECTRON_NODE_MODE_VARIABLE, value);
}
