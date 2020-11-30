/// <reference types="node" />
import * as tstl from "typescript-to-lua";
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { transformIdentifier } from "typescript-to-lua/dist/transformation/visitors/identifier";

function base64_read(path: string): { content: string } | { error: Error } {
  try {
    const bitmap = fs.readFileSync(path);
    return { content: Buffer.from(bitmap).toString("base64") };
  } catch (error) {
    return { error };
  }
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

function createDiagnostic(messageText: string, node: ts.Node): ts.Diagnostic {
  return {
    messageText,
    category: ts.DiagnosticCategory.Error,
    code: 6,
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getEnd() - node.getStart()
  };
}

const transformImportPng: tstl.FunctionVisitor<ts.ImportDeclaration> = (node, context) => {
  if (!node.importClause?.namedBindings || !ts.isNamespaceImport(node.importClause.namedBindings)) {
    context.diagnostics.push(
      createDiagnostic("Only namespace imports are supported. Use 'import * as ...'.", node)
    );
    return;
  }

  if (!ts.isStringLiteral(node.moduleSpecifier)) {
    return;
  }

  const fullSourceFilePath = path.resolve(context.sourceFile.fileName);
  const parentToSourceFilePath = path.dirname(fullSourceFilePath);
  const resolvedPath = path.join(parentToSourceFilePath, node.moduleSpecifier.text);

  const readResult = base64_read(resolvedPath);
  if ("error" in readResult) {
    context.diagnostics.push(
      createDiagnostic(readResult.error.message, node)
    );
    return;
  }

  const args = ["data", "base64", readResult.content].map(toStringLiteral);
  const loveDataDecode = createAccessExpression("love", "data", "decode");
  const loveDataDecodeCall = tstl.createCallExpression(loveDataDecode, args);

  const loveImageNewImageData = createAccessExpression("love", "image", "newImageData");
  const newImageDataCall = tstl.createCallExpression(loveImageNewImageData, [loveDataDecodeCall]);

  const loveGraphicsNewImage = createAccessExpression("love", "graphics", "newImage");
  const newImageCall = tstl.createCallExpression(loveGraphicsNewImage, [newImageDataCall]);

  const identifier = transformIdentifier(context, node.importClause.namedBindings.name);
  return tstl.createVariableDeclarationStatement(identifier, newImageCall);
};

const transformImportDeclaration: tstl.FunctionVisitor<ts.ImportDeclaration> = (node, context) => {
  if (ts.isStringLiteral(node.moduleSpecifier)) {
    const extension = path.extname(node.moduleSpecifier.text);
    switch (extension) {
      case ".png":
        return transformImportPng(node, context);
    }
  }

  return context.superTransformNode(node) as tstl.Statement[];
};

export default {
  visitors: {
    [ts.SyntaxKind.ImportDeclaration]: transformImportDeclaration
  }
} as tstl.Plugin;
