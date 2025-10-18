import { BarrelContentBuilder, BarrelEntry } from '../../../core/services/barrel-content.builder';

describe('BarrelContentBuilder', () => {
  it('builds export statements for files and nested directories', () => {
    const builder = new BarrelContentBuilder();
    const entries = new Map<string, BarrelEntry>();

    entries.set('alpha.ts', { kind: 'file', exports: ['Alpha'] });
    entries.set('beta.ts', { kind: 'file', exports: ['Bravo', 'default'] });
    entries.set('nested', { kind: 'directory' });

    const source = builder.buildContent(entries, '');

    expect(source).toBe(
      [
        "export { Alpha } from './alpha';",
        "export { Bravo } from './beta';",
        "export { default } from './beta';",
        "export * from './nested';",
        '',
      ].join('\n'),
    );
  });
});
