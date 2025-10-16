/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. Please restructure to remove the circular dependency.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        "This is an orphan module - it's likely not used (anymore). Either use it or remove it. If it's logical this module is an orphan (i.e. it's a script aggregating stuff for a build or library) add an exception for it in the dependency-cruiser configuration.",
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
          '\\.d\\.ts$', // TypeScript declaration files
          '(^|/)tsconfig\\.json$', // TypeScript config
          '(^|/)webpack\\.config\\.(js|cjs|mjs)$', // Webpack config
          '(^|/)jest\\.config\\.(js|cjs|mjs)$', // Jest config
          '(^|/)rollup\\.config\\.(js|cjs|mjs)$', // Rollup config
          '(^|/)eslint\\.config\\.(js|cjs|mjs)$', // ESLint config
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern: '^(packages|src|lib|app|bin|test(s?)|spec(s?))/[^/]+|node_modules/[^/]+',
      },
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    webpackConfig: {
      fileName: 'webpack.config.js',
    },
  },
};
