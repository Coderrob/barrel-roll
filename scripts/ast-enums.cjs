const NodeType = Object.freeze({
  BinaryExpression: 'BinaryExpression',
  CallExpression: 'CallExpression',
  ConditionalExpression: 'ConditionalExpression',
  ExportAllDeclaration: 'ExportAllDeclaration',
  ExportNamedDeclaration: 'ExportNamedDeclaration',
  Identifier: 'Identifier',
  ImportDeclaration: 'ImportDeclaration',
  ImportSpecifier: 'ImportSpecifier',
  LogicalExpression: 'LogicalExpression',
  MemberExpression: 'MemberExpression',
  TSIndexedAccessType: 'TSIndexedAccessType',
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
