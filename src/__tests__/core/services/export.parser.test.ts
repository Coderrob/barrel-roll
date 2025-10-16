import { ExportParser } from '../../../core/services/export.parser';

describe('ExportParser', () => {
  it('captures named, default, and aliased exports', () => {
    const parser = new ExportParser();
    const source = `
      export const alpha = 1;
      export function bravo() {}
      export { charlie as delta, echo };
      export default class Foxtrot {}
    `;

    const result = parser.extractExports(source);

    expect(result.sort()).toEqual(['alpha', 'bravo', 'delta', 'echo', 'default'].sort());
  });
});
