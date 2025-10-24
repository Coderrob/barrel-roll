import { BarrelGenerationMode } from './BarrelGenerationMode';

/**
 * Options for generating barrel files.
 */
export interface BarrelGenerationOptions {
  recursive?: boolean;
  mode?: BarrelGenerationMode;
}
