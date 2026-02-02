const NodeType = Object.freeze({
  BinaryExpression: 'BinaryExpression',
  CallExpression: 'CallExpression',
  ConditionalExpression: 'ConditionalExpression',
  Identifier: 'Identifier',
  ImportDeclaration: 'ImportDeclaration',
  ImportSpecifier: 'ImportSpecifier',
  LogicalExpression: 'LogicalExpression',
  MemberExpression: 'MemberExpression',
});

const Operator = Object.freeze({
  Instanceof: 'instanceof',
  LogicalOr: '||',
});

const IdentifierName = Object.freeze({
  Error: 'Error',
  Message: 'message',
  Stack: 'stack',
  String: 'String',
  ToString: 'toString',
});

module.exports = {
  IdentifierName,
  NodeType,
  Operator,
};
