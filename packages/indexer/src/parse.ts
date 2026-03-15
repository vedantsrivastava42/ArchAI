import Parser from "tree-sitter";
import treeSitterTypeScript from "tree-sitter-typescript";
import type { Chunk, SymbolType } from "@archai/types";
import { readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const tsLang = treeSitterTypeScript.typescript as Parameters<Parser["setLanguage"]>[0];

function getSymbolType(node: Parser.SyntaxNode): SymbolType | null {
  const type = node.type;
  if (
    type === "function_declaration" ||
    type === "arrow_function" ||
    type === "function_expression" ||
    type === "method_definition"
  ) {
    return type === "method_definition" ? "method" : "function";
  }
  if (type === "class_declaration") return "class";
  return null;
}

type NodeWithFields = Parser.SyntaxNode & { childForFieldName?(name: string): Parser.SyntaxNode | null };

function getSymbolName(node: Parser.SyntaxNode, source: string): string {
  const n = node as unknown as NodeWithFields;
  const decl = n.childForFieldName?.("declarator") as NodeWithFields | undefined;
  const nameNode = n.childForFieldName?.("name") ?? decl?.childForFieldName?.("name");
  if (nameNode) return source.slice(nameNode.startIndex, nameNode.endIndex).trim();
  return "anonymous";
}

export async function parseFile(
  filePath: string,
  basePath: string,
  repoId: string
): Promise<Chunk[]> {
  const fullPath = join(basePath, filePath);
  const content = await readFile(fullPath, "utf-8");
  const parser = new Parser();
  parser.setLanguage(tsLang);
  const tree = parser.parse(content);
  const chunks: Chunk[] = [];
  const lang = filePath.endsWith(".tsx") ? "tsx" : filePath.endsWith(".ts") ? "ts" : "js";

  function visit(node: Parser.SyntaxNode) {
    const symbolType = getSymbolType(node);
    if (symbolType) {
      const symbolName = getSymbolName(node, content);
      const snippet = content.slice(node.startIndex, node.endIndex);
      chunks.push({
        id: randomUUID(),
        repoId,
        filePath,
        language: lang,
        symbolType,
        symbolName,
        content: snippet,
      });
    }
    for (let i = 0; i < node.childCount; i++) {
      visit(node.child(i)!);
    }
  }
  visit(tree.rootNode);
  return chunks;
}
