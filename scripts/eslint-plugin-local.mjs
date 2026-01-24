import path from 'node:path';

import astEnums from './ast-enums.cjs';

const { IdentifierName, NodeType, Operator } = astEnums;

function isErrorInstanceofTest(node) {
  if (!node) return false;
  if (node.type !== NodeType.BinaryExpression) return false;
  if (node.operator !== Operator.Instanceof) return false;
  if (!node.right) return false;
  if (node.right.type !== NodeType.Identifier) return false;
  if (node.right.name !== IdentifierName.Error) return false;
  return true;
}

function sameIdentifier(a, b) {
  if (!a || !b) return false;
  if (a.type !== NodeType.Identifier) return false;
  if (b.type !== NodeType.Identifier) return false;
  return a.name === b.name;
}

function isValidPropertyIdentifier(property) {
  return property && property.type === NodeType.Identifier;
}

function isStringCallExpression(node, identifier) {
  if (node.type !== NodeType.CallExpression) return false;
  if (node.callee.type !== NodeType.Identifier) return false;
  if (node.callee.name !== IdentifierName.String) return false;
  if (node.arguments.length !== 1) return false;
  return sameIdentifier(node.arguments[0], identifier);
}

function isToStringCallExpression(node, identifier) {
  if (node.type !== NodeType.CallExpression) return false;
  if (node.callee.type !== NodeType.MemberExpression) return false;
  if (!isValidPropertyIdentifier(node.callee.property)) return false;
  if (node.callee.property.name !== IdentifierName.ToString) return false;
  return sameIdentifier(node.callee.object, identifier);
}

function isImportSpecifierWithName(specifier, name) {
  if (specifier.type !== NodeType.ImportSpecifier) return false;
  if (!specifier.imported) return false;
  return specifier.imported.name === name;
}

function computeImportPath(filename) {
  // compute path to src/utils/index.js relative to the file
  const projectRoot = process.cwd();
  const target = path.join(projectRoot, 'src', 'utils', 'index.js');
  let relative = path.relative(path.dirname(filename), target);
  relative = relative.split(path.sep).join('/');
  if (!relative.startsWith('.') && !relative.startsWith('/')) relative = './' + relative;
  return relative;
}

function findImportNode(astBody, importPath) {
  for (const node of astBody) {
    if (
      node.type === NodeType.ImportDeclaration &&
      node.source &&
      node.source.value === importPath
    ) {
      return node;
    }
  }
  return null;
}

function hasNamedImport(astBody, importPath, name) {
  const node = findImportNode(astBody, importPath);
  if (!node) return false;
  const specifiers = node.specifiers || [];
  return specifiers.some((s) => isImportSpecifierWithName(s, name));
}

function canMergeNamedImport(importNode) {
  if (!importNode || !importNode.specifiers) return false;
  // Only merge if there's at least one ImportSpecifier (named imports exist)
  return importNode.specifiers.some((s) => s.type === NodeType.ImportSpecifier);
}

function mergeNamedImportText(sourceCode, importNode, name) {
  const original = sourceCode.getText(importNode);
  const open = original.indexOf('{');
  const close = original.lastIndexOf('}');
  if (open === -1 || close === -1) return null;
  const inside = original.slice(open + 1, close).trim();
  const newInside = inside ? `${inside}, ${name}` : name;
  return original.slice(0, open + 1) + newInside + original.slice(close);
}

// Strategy Pattern: Pattern Matching Strategies
class PatternMatcher {
  constructor(testNode, leftIdentifier) {
    this.testNode = testNode;
    this.left = leftIdentifier;
  }

  matches(consequent, alternate) {
    return false; // Abstract method
  }
}

class MessagePatternMatcher extends PatternMatcher {
  matches(consequent, alternate) {
    // pattern: left.message
    if (consequent.type !== NodeType.MemberExpression) return false;
    if (!isValidPropertyIdentifier(consequent.property)) return false;
    if (consequent.property.name !== IdentifierName.Message) return false;
    if (!sameIdentifier(consequent.object || consequent, this.left)) return false;

    return (
      isStringCallExpression(alternate, this.left) || isToStringCallExpression(alternate, this.left)
    );
  }
}

class StackOrMessagePatternMatcher extends PatternMatcher {
  matches(consequent, alternate) {
    // pattern: left.stack || left.message
    if (consequent.type !== NodeType.LogicalExpression) return false;
    if (consequent.operator !== Operator.LogicalOr) return false;

    const isLeftStack =
      (consequent.left.type === NodeType.MemberExpression &&
        consequent.left.property.name === IdentifierName.Stack) ||
      (consequent.left.type === NodeType.Identifier &&
        consequent.left.name === IdentifierName.Stack);

    if (!isLeftStack) return false;

    return (
      isStringCallExpression(alternate, this.left) || isToStringCallExpression(alternate, this.left)
    );
  }
}

// Template Method Pattern: Import Fixer
class ImportFixer {
  constructor(sourceCode, astBody, importPath, functionName) {
    this.sourceCode = sourceCode;
    this.astBody = astBody;
    this.importPath = importPath;
    this.functionName = functionName;
  }

  createFixes() {
    const fixes = [];
    if (!hasNamedImport(this.astBody, this.importPath, this.functionName)) {
      const existingImport = findImportNode(this.astBody, this.importPath);
      const lastImport = this.astBody
        .slice()
        .reverse()
        .find((n) => n.type === NodeType.ImportDeclaration);

      if (existingImport) {
        this.addToExistingImport(fixes, existingImport, lastImport);
      } else {
        this.addNewImport(fixes, lastImport);
      }
    }
    return fixes;
  }

  addToExistingImport(fixes, existingImport, lastImport) {
    if (!canMergeNamedImport(existingImport)) {
      this.addNewImport(fixes, lastImport);
      return;
    }

    const merged = mergeNamedImportText(this.sourceCode, existingImport, this.functionName);
    if (!merged) {
      this.addNewImport(fixes, lastImport);
      return;
    }

    fixes.push(this.sourceCode.constructor.prototype.replaceText(existingImport, merged));
  }

  addNewImport(fixes, lastImport) {
    const importText = `\nimport { ${this.functionName} } from '${this.importPath}';`;
    if (lastImport) {
      fixes.push(
        this.sourceCode.constructor.prototype.insertTextAfterRange(lastImport.range, importText),
      );
    } else {
      fixes.push(this.sourceCode.constructor.prototype.insertTextBeforeRange([0, 0], importText));
    }
  }
}

export const rules = {
  'no-instanceof-error-autofix': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          "Replace ad-hoc 'instanceof Error' ternaries with `getErrorMessage` or `formatErrorForLog` to standardize error handling.",
      },
      fixable: 'code',
      schema: [],
    },
    create(context) {
      const sourceCode = context.getSourceCode();

      return {
        ConditionalExpression(node) {
          const test = node.test;
          if (!isErrorInstanceofTest(test)) return;

          const filename = context.getFilename();
          const importPath = computeImportPath(filename);

          const left = test.left; // Identifier
          const consequent = node.consequent;
          const alternate = node.alternate;

          const messageMatcher = new MessagePatternMatcher(test, left);
          const stackMatcher = new StackOrMessagePatternMatcher(test, left);

          const altMatches =
            isStringCallExpression(alternate, left) || isToStringCallExpression(alternate, left);

          if (messageMatcher.matches(consequent, alternate) && altMatches) {
            context.report({
              node,
              message: 'Use getErrorMessage() for predictable error messaging.',
              fix(fixer) {
                const leftText = sourceCode.getText(left);
                const fixes = [fixer.replaceText(node, `getErrorMessage(${leftText})`)];

                const fixerInstance = new ImportFixer(
                  sourceCode,
                  sourceCode.ast.body,
                  importPath,
                  'getErrorMessage',
                );
                fixes.push(...fixerInstance.createFixes());

                return fixes;
              },
            });
          } else if (stackMatcher.matches(consequent, alternate) && altMatches) {
            context.report({
              node,
              message: 'Use formatErrorForLog() to preserve stack or message for logging.',
              fix(fixer) {
                const leftText = sourceCode.getText(left);
                const fixes = [fixer.replaceText(node, `formatErrorForLog(${leftText})`)];

                const fixerInstance = new ImportFixer(
                  sourceCode,
                  sourceCode.ast.body,
                  importPath,
                  'formatErrorForLog',
                );
                fixes.push(...fixerInstance.createFixes());

                return fixes;
              },
            });
          }
        },
      };
    },
  },
};

export {
  computeImportPath,
  findImportNode,
  hasNamedImport,
  canMergeNamedImport,
  mergeNamedImportText,
};
export default { rules };
