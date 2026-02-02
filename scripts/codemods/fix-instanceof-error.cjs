const { IdentifierName, NodeType, Operator } = require('../ast-enums.cjs');

function isErrorInstanceofTest(node) {
  return (
    node &&
    node.type === NodeType.BinaryExpression &&
    node.operator === Operator.Instanceof &&
    node.right &&
    ((node.right.type === NodeType.Identifier && node.right.name === IdentifierName.Error) ||
      (node.right.type === NodeType.MemberExpression &&
        node.right.property.name === IdentifierName.Error))
  );
}

function sameIdentifier(a, b) {
  return (
    a && b && a.type === NodeType.Identifier && b.type === NodeType.Identifier && a.name === b.name
  );
}

function isValidPropertyIdentifier(property) {
  return property && property.type === NodeType.Identifier;
}

function isStringCallExpression(node, identifier) {
  return (
    node.type === NodeType.CallExpression &&
    node.callee.type === NodeType.Identifier &&
    node.callee.name === IdentifierName.String &&
    node.arguments.length === 1 &&
    sameIdentifier(node.arguments[0], identifier)
  );
}

function isToStringCallExpression(node, identifier) {
  return (
    node.type === NodeType.CallExpression &&
    node.callee.type === NodeType.MemberExpression &&
    isValidPropertyIdentifier(node.callee.property) &&
    node.callee.property.name === IdentifierName.ToString &&
    sameIdentifier(node.callee.object, identifier)
  );
}

/**
 * jscodeshift transformer to replace patterns like
 *  - error instanceof Error ? error.message : String(error)
 * with
 *  - getErrorMessage(error)
 * and patterns like
 *  - error instanceof Error ? error.stack || error.message : String(error)
 * with
 *  - formatErrorForLog(error)
 *
 * Usage:
 *  npx jscodeshift -t scripts/codemods/fix-instanceof-error.cjs src --extensions=ts,tsx --parser=ts
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Replace conditional expressions matching the pattern
  root.find(j.ConditionalExpression).forEach((path) => {
    const { node } = path;
    if (!isErrorInstanceofTest(node.test)) return;

    const left = node.test.left;

    // check consequent patterns
    // pattern1: left.message
    const cond = node.consequent;
    const alt = node.alternate;

    const patternMessage =
      cond.type === NodeType.MemberExpression &&
      isValidPropertyIdentifier(cond.property) &&
      cond.property.name === IdentifierName.Message &&
      sameIdentifier(cond.object, left);
    const patternStackOrMessage =
      cond.type === NodeType.LogicalExpression &&
      cond.operator === Operator.LogicalOr &&
      sameIdentifier(cond.left.object || cond.left, left) &&
      ((cond.left.property && cond.left.property.name === IdentifierName.Stack) ||
        cond.left.name === IdentifierName.Stack);

    // Check alternate is String(left) or template String(left) or left.toString()
    const altMatches = isStringCallExpression(alt, left) || isToStringCallExpression(alt, left);

    if (patternMessage && altMatches) {
      const replacement = j.callExpression(j.identifier('getErrorMessage'), [
        j.identifier(left.name),
      ]);
      j(path).replaceWith(replacement);
      return;
    }

    if (patternStackOrMessage && altMatches) {
      const replacement = j.callExpression(j.identifier('formatErrorForLog'), [
        j.identifier(left.name),
      ]);
      j(path).replaceWith(replacement);
    }
  });

  return root.toSource({ quote: 'single' });
};
