import { ExportParser } from '../../../core/services/export.parser';

describe('ExportParser', () => {
  let parser: ExportParser;

  beforeEach(() => {
    parser = new ExportParser();
  });

  describe('extractExports', () => {
    it('should capture named, default, and aliased exports', () => {
      const source = `
      export const alpha = 1;
      export function bravo() {}
      export { charlie as delta, echo };
      export default class Foxtrot {}
      export interface Golf {}
      export { type Hotel }
    `;

      const result = parser.extractExports(source);

      expect(result).toEqual(
        expect.arrayContaining([
          { name: 'alpha', typeOnly: false },
          { name: 'bravo', typeOnly: false },
          { name: 'delta', typeOnly: false },
          { name: 'echo', typeOnly: false },
          { name: 'default', typeOnly: false },
          { name: 'Golf', typeOnly: true },
          { name: 'Hotel', typeOnly: true },
        ]),
      );
      expect(result).toHaveLength(7);
    });

    it('should return an empty array when no exports exist', () => {
      const result = parser.extractExports('const unused = 1;');

      expect(result).toEqual([]);
    });

    const extractCases: Array<{ source: string; expected: { name: string; typeOnly: boolean } }> = [
      {
        source: 'export default function alpha() {}',
        expected: { name: 'default', typeOnly: false },
      },
      {
        source: 'export type { Bravo }',
        expected: { name: 'Bravo', typeOnly: true },
      },
      {
        source: 'export const charlie = 3;',
        expected: { name: 'charlie', typeOnly: false },
      },
    ];

    // Table-driven tests follow the convention of omitting human-readable titles; prefer standalone tests when unique naming is needed.
    it.each(extractCases)('should capture simple export pattern %#', ({ source, expected }) => {
      const result = parser.extractExports(source);

      expect(result).toContainEqual(expected);
    });
  });
});
