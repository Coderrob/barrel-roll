(() => {
  'use strict';
  var e = {
      d: (r, t) => {
        for (var i in t)
          e.o(t, i) && !e.o(r, i) && Object.defineProperty(r, i, { enumerable: !0, get: t[i] });
      },
      o: (e, r) => Object.prototype.hasOwnProperty.call(e, r),
      r: (e) => {
        ('undefined' != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
          Object.defineProperty(e, '__esModule', { value: !0 }));
      },
    },
    r = {};
  (e.r(r), e.d(r, { activate: () => p, deactivate: () => h }));
  const t = require('path'),
    i = require('vscode'),
    s = 'default',
    n = '..';
  class o {
    buildContent(e, r) {
      const t = [],
        i = this.normalizeEntries(e),
        s = Array.from(i.keys()).sort();
      for (const e of s) {
        const r = i.get(e);
        if (!r) continue;
        const s = this.createLinesForEntry(e, r);
        s.length > 0 && t.push(...s);
      }
      return t.join('\n') + '\n';
    }
    normalizeEntries(e) {
      const r = new Map();
      for (const [t, i] of e)
        Array.isArray(i) ? r.set(t, { kind: 'file', exports: i }) : r.set(t, i);
      return r;
    }
    createLinesForEntry(e, r) {
      return 'directory' === r.kind
        ? this.buildDirectoryExportLines(e)
        : this.buildFileExportLines(e, r.exports);
    }
    buildDirectoryExportLines(e) {
      const r = this.getModulePath(e);
      return r.startsWith(n) ? [] : [`export * from './${r}';`];
    }
    buildFileExportLines(e, r) {
      const t = r.filter((e) => !e.includes(n));
      if (0 === t.length) return [];
      const i = this.getModulePath(e);
      return i.startsWith(n) ? [] : this.generateExportStatements(i, t);
    }
    generateExportStatements(e, r) {
      const t = r.includes(s),
        i = r.some((e) => e !== s);
      if (t && !i) return [`export { default } from './${e}';`];
      const n = [];
      if (i) {
        const t = r.filter((e) => e !== s);
        n.push(`export { ${t.join(', ')} } from './${e}';`);
      }
      return (t && n.push(`export { default } from './${e}';`), n);
    }
    getModulePath(e) {
      let r = e.replace(/\.tsx?$/, '');
      return ((r = r.replace(/\\/g, '/')), r);
    }
  }
  class a {
    extractExports(e) {
      const r = [],
        t = this.removeComments(e),
        i =
          /export\s+(?:abstract\s+)?(?:class|interface|type|function|const|enum|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
      let s;
      for (; null !== (s = i.exec(t)); ) r.push(s[1]);
      const n = /export\s*\{([^}]+)\}/g;
      for (; null !== (s = n.exec(t)); ) {
        const e = s[1]
          .split(',')
          .map(
            (e) =>
              e
                .trim()
                .split(/\s+as\s+/i)
                .map((e) => e.trim())
                .filter((e) => e.length > 0)
                .pop() ?? '',
          )
          .filter((e) => e.length > 0);
        r.push(...e);
      }
      return (/export\s+default\s+/.test(t) && r.push('default'), [...new Set(r)]);
    }
    removeComments(e) {
      let r = e.replace(/\/\*[\s\S]*?\*\//g, '');
      return ((r = r.replace(/\/\/.*$/gm, '')), r);
    }
  }
  const l = require('fs/promises'),
    c = new Set(['node_modules', '.git']);
  class u {
    async getTypeScriptFiles(e) {
      return (await this.readDirectory(e))
        .filter((e) => this.isTypeScriptFile(e))
        .map((r) => t.join(e, r.name));
    }
    async getSubdirectories(e) {
      return (await this.readDirectory(e))
        .filter((e) => this.isTraversableDirectory(e))
        .map((r) => t.join(e, r.name));
    }
    isTypeScriptFile(e) {
      if (!e.isFile()) return !1;
      const r = 'index.ts' === e.name,
        t = e.name.endsWith('.d.ts');
      return (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) && !r && !t;
    }
    isTraversableDirectory(e) {
      return e.isDirectory() && !c.has(e.name) && !e.name.startsWith('.');
    }
    async readFile(e) {
      try {
        return await l.readFile(e, 'utf-8');
      } catch (r) {
        throw new Error(`Failed to read file ${e}: ${r instanceof Error ? r.message : String(r)}`);
      }
    }
    async writeFile(e, r) {
      try {
        await l.writeFile(e, r, 'utf-8');
      } catch (r) {
        throw new Error(`Failed to write file ${e}: ${r instanceof Error ? r.message : String(r)}`);
      }
    }
    async fileExists(e) {
      try {
        return (await l.access(e), !0);
      } catch {
        return !1;
      }
    }
    async readDirectory(e) {
      try {
        return await l.readdir(e, { withFileTypes: !0 });
      } catch (e) {
        throw new Error(`Failed to read directory: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  const d = 'index.ts';
  class f {
    fileSystemService;
    exportParser;
    barrelContentBuilder;
    constructor(e, r, t) {
      ((this.fileSystemService = e || new u()),
        (this.exportParser = r || new a()),
        (this.barrelContentBuilder = t || new o()));
    }
    async generateBarrelFile(e, r) {
      const t = this.normalizeOptions(r);
      await this.generateBarrelFileFromPath(e.fsPath, t);
    }
    async generateBarrelFileFromPath(e, r) {
      const i = t.join(e, d),
        { tsFiles: s, subdirectories: n } = await this.readDirectoryInfo(e);
      r.recursive && (await this.processChildDirectories(n, r));
      const o = await this.collectEntries(e, s, n),
        a = await this.fileSystemService.fileExists(i);
      if (!this.shouldWriteBarrel(o, r, a)) return;
      const l = this.barrelContentBuilder.buildContent(o, e);
      await this.fileSystemService.writeFile(i, l);
    }
    async readDirectoryInfo(e) {
      const [r, t] = await Promise.all([
        this.fileSystemService.getTypeScriptFiles(e),
        this.fileSystemService.getSubdirectories(e),
      ]);
      return { tsFiles: r, subdirectories: t };
    }
    async processChildDirectories(e, r) {
      for (const i of e)
        ('updateExisting' !== r.mode || (await this.fileSystemService.fileExists(t.join(i, d)))) &&
          (await this.generateBarrelFileFromPath(i, r));
    }
    async collectEntries(e, r, t) {
      const i = new Map();
      return (await this.addFileEntries(e, r, i), await this.addSubdirectoryEntries(e, t, i), i);
    }
    async addFileEntries(e, r, i) {
      for (const s of r) {
        const r = await this.fileSystemService.readFile(s),
          n = this.exportParser.extractExports(r);
        if (0 === n.length) continue;
        const o = t.relative(e, s);
        i.set(o, { kind: 'file', exports: n });
      }
    }
    async addSubdirectoryEntries(e, r, i) {
      for (const s of r) {
        const r = t.join(s, d);
        if (!(await this.fileSystemService.fileExists(r))) continue;
        const n = t.relative(e, s);
        i.set(n, { kind: 'directory' });
      }
    }
    shouldWriteBarrel(e, r, t) {
      if (e.size > 0) return !0;
      if ('updateExisting' === r.mode) return t;
      if (!r.recursive) throw new Error('No TypeScript files found in the selected directory');
      return t;
    }
    normalizeOptions(e) {
      return { recursive: e?.recursive ?? !1, mode: e?.mode ?? 'createOrUpdate' };
    }
  }
  function p(e) {
    console.log('Barrel Roll extension is now active');
    const r = new f(),
      t = [
        {
          id: 'barrel-roll.generateBarrel',
          options: { recursive: !1, mode: 'createOrUpdate' },
          progressTitle: 'Barrel Roll: Generating barrel...',
          successMessage: 'Barrel Roll: barrel file generated successfully.',
        },
        {
          id: 'barrel-roll.generateBarrelRecursive',
          options: { recursive: !0, mode: 'createOrUpdate' },
          progressTitle: 'Barrel Roll: Generating barrels recursively...',
          successMessage: 'Barrel Roll: barrel files generated recursively.',
        },
        {
          id: 'barrel-roll.updateBarrel',
          options: { recursive: !0, mode: 'updateExisting' },
          progressTitle: 'Barrel Roll: Updating barrels...',
          successMessage: 'Barrel Roll: barrel files sanitized successfully.',
        },
      ];
    for (const i of t) {
      const t = y(r, i);
      e.subscriptions.push(t);
    }
  }
  function h() {}
  function y(e, r) {
    return i.commands.registerCommand(r.id, async (s) => {
      try {
        const n = await (async function (e) {
          const r =
            e ??
            (await (async function () {
              const e = await i.window.showOpenDialog({
                canSelectFiles: !1,
                canSelectFolders: !0,
                canSelectMany: !1,
                openLabel: 'Select folder to barrel',
              });
              if (e && 0 !== e.length) return e[0];
            })());
          if (r)
            return (async function (e) {
              try {
                const r = await i.workspace.fs.stat(e);
                if (r.type === i.FileType.Directory) return e;
                if (r.type === i.FileType.File) return i.Uri.file(t.dirname(e.fsPath));
              } catch (e) {
                const r = e instanceof Error ? e.message : String(e);
                throw new Error(`Unable to access selected resource: ${r}`);
              }
              return e;
            })(r);
        })(s);
        if (!n) return;
        (await (async function (t) {
          return i.window.withProgress(
            { location: i.ProgressLocation.Window, title: t },
            async () => {
              await e.generateBarrelFile(n, r.options);
            },
          );
        })(r.progressTitle),
          i.window.showInformationMessage(r.successMessage));
      } catch (e) {
        const r = e instanceof Error ? e.message : String(e);
        i.window.showErrorMessage(`Barrel Roll: ${r}`);
      }
    });
  }
  module.exports = r;
})();
//# sourceMappingURL=extension.js.map
