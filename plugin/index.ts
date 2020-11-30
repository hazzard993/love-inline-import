/// <reference types="node" />
import * as tstl from "typescript-to-lua";
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { transformIdentifier } from "typescript-to-lua/dist/transformation/visitors/identifier";

function base64_read(path: string) {
  const bitmap = fs.readFileSync(path);
  return Buffer.from(bitmap).toString("base64");
}

function createAccessExpression(...[tableName, ...names]: string[]): tstl.Expression {
  const table = tstl.createIdentifier(tableName);
  let expression: tstl.Expression = table;
  for (const name of names) {
    const index = tstl.createStringLiteral(name);
    expression = tstl.createTableIndexExpression(expression, index);
  }
  return expression;
}

function toStringLiteral(string: string): tstl.StringLiteral {
  return tstl.createStringLiteral(string);
}

function transformImportPng(fullPngPath: string, identifier: tstl.Identifier): tstl.Statement {
  const pngEncodedString = base64_read(fullPngPath);
  const args = ["data", "base64", pngEncodedString].map(toStringLiteral);
  const loveDataDecode = createAccessExpression("love", "data", "decode");
  const loveDataDecodeCall = tstl.createCallExpression(loveDataDecode, args);

  const loveImageNewImageData = createAccessExpression("love", "image", "newImageData");
  const newImageDataCall = tstl.createCallExpression(loveImageNewImageData, [loveDataDecodeCall]);

  const loveGraphicsNewImage = createAccessExpression("love", "graphics", "newImage");
  const newImageCall = tstl.createCallExpression(loveGraphicsNewImage, [newImageDataCall]);
  return tstl.createVariableDeclarationStatement(identifier, newImageCall);
}

const transformImportDeclaration: tstl.FunctionVisitor<ts.ImportDeclaration> = (node, context) => {
  if (ts.isStringLiteral(node.moduleSpecifier)) {
    const fullSourceFilePath = path.resolve(context.sourceFile.fileName);
    const parentToSourceFilePath = path.dirname(fullSourceFilePath);
    const resolvedPath = path.join(parentToSourceFilePath, node.moduleSpecifier.text);
    const extension = path.extname(node.moduleSpecifier.text);
    switch (extension) {
      case ".png":
        if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
          const left = transformIdentifier(context, node.importClause.namedBindings.name);
          return transformImportPng(resolvedPath, left);
        }
      default:
        console.log(extension);
    }
  }

  return context.superTransformNode(node) as tstl.Statement[];
};

export default {
  visitors: {
    [ts.SyntaxKind.ImportDeclaration]: transformImportDeclaration
  }
} as tstl.Plugin;
