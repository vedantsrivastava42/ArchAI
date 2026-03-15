import Parser from "tree-sitter";
import treeSitterJavaScript from "tree-sitter-javascript";
import treeSitterTypeScript from "tree-sitter-typescript";
import treeSitterPython from "tree-sitter-python";
import treeSitterJava from "tree-sitter-java";
import treeSitterGo from "tree-sitter-go";
import treeSitterRuby from "tree-sitter-ruby";
import type { Chunk, SymbolType } from "@archai/types";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

/** Skip files larger than this to avoid memory issues and non-code blobs. */
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

type ParserLanguage = Parameters<Parser["setLanguage"]>[0];

interface NodeRule {
  nodeTypes: string[];
  symbolType: SymbolType;
  namePath: string[];
}

interface LangConfig {
  language: ParserLanguage;
  langId: string;
  nodeConfig: NodeRule[];
}

function buildNodeTypeMap(nodeConfig: NodeRule[]): Map<string, NodeRule> {
  const m = new Map<string, NodeRule>();
  for (const rule of nodeConfig) {
    for (const t of rule.nodeTypes) m.set(t, rule);
  }
  return m;
}

const JS_TS_NODE_CONFIG: NodeRule[] = [
  {
    nodeTypes: ["function_declaration", "arrow_function", "function_expression"],
    symbolType: "function",
    namePath: ["name"],
  },
  { nodeTypes: ["method_definition"], symbolType: "method", namePath: ["name"] },
  { nodeTypes: ["class_declaration"], symbolType: "class", namePath: ["name"] },
];

const PYTHON_NODE_CONFIG: NodeRule[] = [
  { nodeTypes: ["function_definition"], symbolType: "function", namePath: ["name"] },
  { nodeTypes: ["class_definition"], symbolType: "class", namePath: ["name"] },
];

const JAVA_NODE_CONFIG: NodeRule[] = [
  { nodeTypes: ["method_declaration"], symbolType: "method", namePath: ["name"] },
  { nodeTypes: ["class_declaration"], symbolType: "class", namePath: ["name"] },
];

const GO_NODE_CONFIG: NodeRule[] = [
  { nodeTypes: ["function_declaration"], symbolType: "function", namePath: ["name"] },
  { nodeTypes: ["method_declaration"], symbolType: "method", namePath: ["name"] },
  { nodeTypes: ["type_declaration"], symbolType: "class", namePath: [] }, // name via fallback
];

const RUBY_NODE_CONFIG: NodeRule[] = [
  { nodeTypes: ["method", "singleton_method"], symbolType: "method", namePath: ["name"] },
  { nodeTypes: ["lambda"], symbolType: "function", namePath: ["name"] },
  { nodeTypes: ["class", "module"], symbolType: "class", namePath: ["name"] },
];

const GRAMMAR_REGISTRY: Record<string, LangConfig> = {
  ".ts": {
    language: treeSitterTypeScript.typescript as ParserLanguage,
    langId: "ts",
    nodeConfig: JS_TS_NODE_CONFIG,
  },
  ".tsx": {
    language: treeSitterTypeScript.tsx as ParserLanguage,
    langId: "tsx",
    nodeConfig: JS_TS_NODE_CONFIG,
  },
  ".js": {
    language: treeSitterJavaScript as ParserLanguage,
    langId: "js",
    nodeConfig: JS_TS_NODE_CONFIG,
  },
  ".jsx": {
    language: treeSitterJavaScript as ParserLanguage,
    langId: "jsx",
    nodeConfig: JS_TS_NODE_CONFIG,
  },
  ".py": {
    language: treeSitterPython as ParserLanguage,
    langId: "py",
    nodeConfig: PYTHON_NODE_CONFIG,
  },
  ".java": {
    language: treeSitterJava as ParserLanguage,
    langId: "java",
    nodeConfig: JAVA_NODE_CONFIG,
  },
  ".go": {
    language: treeSitterGo as ParserLanguage,
    langId: "go",
    nodeConfig: GO_NODE_CONFIG,
  },
  ".rb": {
    language: treeSitterRuby as ParserLanguage,
    langId: "rb",
    nodeConfig: RUBY_NODE_CONFIG,
  },
};

const PARSED_EXTENSIONS = new Set(Object.keys(GRAMMAR_REGISTRY));

type NodeWithFields = Parser.SyntaxNode & {
  childForFieldName?(name: string): Parser.SyntaxNode | null;
};

function getSymbolName(
  source: string,
  node: Parser.SyntaxNode,
  namePath: string[]
): string {
  const n = node as unknown as NodeWithFields;
  const cf = n.childForFieldName?.bind(n);
  if (!cf) return "anonymous";

  let current: Parser.SyntaxNode | null = node;
  if (namePath.length > 0) {
    for (const field of namePath) {
      current = (current as unknown as NodeWithFields).childForFieldName?.(field) ?? null;
      if (!current) break;
    }
  }

  if (current) {
    const text = source.slice(current.startIndex, current.endIndex).trim();
    if (text) return text;
  }

  // Go type_declaration: name is on first child (type_spec) as "name"
  if (node.type === "type_declaration" && node.childCount > 0) {
    const first = node.child(0) as unknown as NodeWithFields;
    const nameNode = first?.childForFieldName?.("name");
    if (nameNode) {
      const text = source.slice(nameNode.startIndex, nameNode.endIndex).trim();
      if (text) return text;
    }
  }

  // TS/JS: fallback for export default etc.
  if (namePath[0] === "name") {
    current = (node as unknown as NodeWithFields).childForFieldName?.("declarator") ?? null;
    if (current) current = (current as unknown as NodeWithFields).childForFieldName?.("name") ?? null;
    if (current) {
      const text = source.slice(current.startIndex, current.endIndex).trim();
      if (text) return text;
    }
  }

  return "anonymous";
}

export async function parseFile(
  filePath: string,
  basePath: string,
  repoId: string
): Promise<Chunk[]> {
  const fullPath = join(basePath, filePath);
  const st = await stat(fullPath);
  if (!st.isFile() || st.size > MAX_FILE_SIZE_BYTES) {
    return [];
  }

  const ext = filePath.toLowerCase().endsWith(".tsx")
    ? ".tsx"
    : filePath.toLowerCase().endsWith(".jsx")
      ? ".jsx"
      : filePath.includes(".")
        ? "." + filePath.split(".").pop()!.toLowerCase()
        : "";
  const config = GRAMMAR_REGISTRY[ext];
  if (!config || !PARSED_EXTENSIONS.has(ext)) {
    return [];
  }

  const content = await readFile(fullPath, "utf-8");
  const parser = new Parser();
  parser.setLanguage(config.language);
  const tree = parser.parse(content);
  const chunks: Chunk[] = [];
  const nodeMap = buildNodeTypeMap(config.nodeConfig);

  function visit(node: Parser.SyntaxNode) {
    const rule = nodeMap.get(node.type);
    if (rule) {
      const symbolName = getSymbolName(content, node, rule.namePath);
      const snippet = content.slice(node.startIndex, node.endIndex);
      chunks.push({
        id: randomUUID(),
        repoId,
        filePath,
        language: config.langId,
        symbolType: rule.symbolType,
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
