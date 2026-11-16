/**
 * Type declarations for the `pug` package.
 *
 * This types the public API surface — including the "pug as data" and
 * "pug as tree" helpers — so a TypeScript engine, editor, or generator
 * can consume it with full type information. The runtime implementation
 * remains CommonJS JavaScript; these declarations describe its shape.
 */

/* ------------------------------------------------------------------ */
/* Runtime helpers (re-exported from pug-runtime)                      */
/* ------------------------------------------------------------------ */

export interface PugRuntime {
  escape(val: unknown): string;
  /** Always throws the given error; does not return. */
  rethrow(err: unknown): never;
  interpolate(val: unknown, line?: number): string;
  concat(val: unknown, line?: number): string;
  attrs(obj: object, escaped: boolean): string;
  attr(name: string, val: unknown, quoted: boolean, mustEscape: boolean): string;
  [key: string]: unknown;
}

/** Pug runtime helpers (string escaping, attribute quoting, ...). */
export const runtime: PugRuntime;

/** Pug template language name, for detection. */
export const name: string;

/**
 * Global registry of custom filters.  A filter receives the block text
 * and the current options and returns the transformed string.
 */
export const filters: Record<string, (text: string, options: PugOptions) => string>;

/** Template function cache keyed by filename. */
export const cache: Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export interface PugPlugin {
  lex?: (str: string, options?: Record<string, unknown>) => string;
  parse?: (tokens: unknown[], options?: Record<string, unknown>) => unknown;
}

/** Options accepted by the compile / render / tree entry points. */
export interface PugOptions {
  /** Filename, used for error reporting and include resolution. */
  filename?: string;
  /** Base directory for resolving relative includes/extends. */
  basedir?: string;
  /** Pretty-print the HTML output. */
  pretty?: boolean;
  /** Doctype string, e.g. `"html"` or `"5"`. */
  doctype?: string;
  /** Tags that should be rendered self-closing. */
  selfClosing?: Record<string, string>;
  /** Strict mode. */
  strict?: boolean;
  /** Include debug source maps in the compiled output. */
  compileDebug?: boolean;
  /** Short form of compileDebug. */
  debug?: boolean;
  /** Omit the compiled debug block. */
  noDebug?: boolean;
  /** Inline the runtime functions into the emitted code. */
  inlineRuntimeFunctions?: boolean;
  /** Cache compiled templates (requires `filename`). */
  cache?: boolean;
  /** Data made available to the template. */
  data?: Record<string, unknown>;
  /** Custom filters used during compilation. */
  filters?: Record<string, unknown>;
  /** Options forwarded to filters. */
  filterOptions?: Record<string, unknown>;
  /** Filter name aliases. */
  filterAliases?: Record<string, string>;
  /** Compiler plugins (lex / parse transforms). */
  plugins?: PugPlugin[];
  /** Accept any other documented or plugin-supplied option. */
  [key: string]: unknown;
}

/** The result of `compile` / `compileFile`: a renderable template fn. */
export interface PugTemplate {
  (data?: Record<string, unknown>, options?: PugOptions): string;
  /** Filenames that this template depends on (for rebuilds). */
  dependencies?: string[];
}

/* ------------------------------------------------------------------ */
/* Pug as data                                                         */
/* ------------------------------------------------------------------ */

/** Any plain value that the `pug` data format can produce. */
export type DataValue =
  | string
  | number
  | boolean
  | null
  | DataValue[]
  | { [key: string]: DataValue };

/**
 * Parse a pug-style indented data document into a plain value
 * (object, array, scalar, or `null` for an empty document).
 */
export function data(str: string): DataValue;

/**
 * Serialize any plain JS value to a YAML string (2-space indents).
 */
export function toYaml(value: unknown): string;

/**
 * Parse a pug-style data document and serialize it straight to YAML.
 */
export function renderData(str: string): string;

/* ------------------------------------------------------------------ */
/* Pug as tree                                                         */
/* ------------------------------------------------------------------ */

/** Attribute values are normalized strings; repeats merge to arrays. */
export type PugAttrValue = string | boolean | (string | boolean)[];
export type PugAttrMap = Record<string, PugAttrValue>;

/** Shared shape every tree node carries (only when `positions` is set). */
export interface PugNodeBase {
  line?: number;
  column?: number;
}

export interface PugTagNode extends PugNodeBase {
  tag: string;
  attrs: PugAttrMap;
  children: PugTreeNode[];
}

/** A tag whose name is an expression, e.g. `#{expr}`. */
export interface PugTagExprNode extends PugNodeBase {
  tagExpr: string;
  attrs: PugAttrMap;
  children: PugTreeNode[];
}

export interface PugTextNode extends PugNodeBase {
  text: string;
}

/** `- var x` / `= expr`.  `buffer` is true for `=` (inline the value). */
export interface PugCodeNode extends PugNodeBase {
  code: string;
  buffer: boolean;
}

export interface PugEachNode extends PugNodeBase {
  each: { key?: string; val: string; obj: string };
  children: PugTreeNode[];
}

export interface PugIfNode extends PugNodeBase {
  if: string;
  children: PugTreeNode[];
  else?: PugTreeNode[];
}

export interface PugWhileNode extends PugNodeBase {
  while: string;
  children: PugTreeNode[];
}

export interface PugCaseNode extends PugNodeBase {
  case: string;
  when: { test: string; children: PugTreeNode[] }[];
  else?: PugTreeNode[];
}

export interface PugFilterNode extends PugNodeBase {
  filter: string;
  attrs: PugAttrMap;
  children: PugTreeNode[];
}

export interface PugRawIncludeNode extends PugNodeBase {
  rawInclude: string;
  filters: string[];
}

/** A faithful (not inlined) include marker. */
export interface PugIncludeNode extends PugNodeBase {
  include: string;
}

/** A faithful (not inlined) extends marker. */
export interface PugExtendsNode extends PugNodeBase {
  extends: string;
}

export interface PugDoctypeNode extends PugNodeBase {
  doctype: string;
}

export interface PugCommentNode extends PugNodeBase {
  comment: string;
  children: PugTreeNode[];
}

export interface PugBlockCommentNode extends PugNodeBase {
  blockComment: string;
  children: PugTreeNode[];
}

export interface PugBlockNode extends PugNodeBase {
  block: string;
  children: PugTreeNode[];
}

/** A `mixin` definition. */
export interface PugMixinDefNode extends PugNodeBase {
  mixin: { name: string; params?: string };
  children: PugTreeNode[];
}

/** A `+name` mixin call; `children` holds any passed block content. */
export interface PugUseNode extends PugNodeBase {
  use: { name: string; args?: string };
  attrs: PugAttrMap;
  children?: PugTreeNode[];
}

/** A `block` (mixin slot) or `yield` (named-block yield) marker. */
export interface PugYieldNode extends PugNodeBase {
  yield: 'block' | 'content';
}

export type PugTreeNode =
  | PugTagNode
  | PugTagExprNode
  | PugTextNode
  | PugCodeNode
  | PugEachNode
  | PugIfNode
  | PugWhileNode
  | PugCaseNode
  | PugFilterNode
  | PugRawIncludeNode
  | PugIncludeNode
  | PugExtendsNode
  | PugDoctypeNode
  | PugCommentNode
  | PugBlockCommentNode
  | PugBlockNode
  | PugMixinDefNode
  | PugUseNode
  | PugYieldNode;

/** Options accepted by `pug.tree`. */
export interface PugTreeOptions {
  /** Add `line` / `column` to every node. */
  positions?: boolean;
  /** Filename reported in parser errors. */
  filename?: string;
  [key: string]: unknown;
}

/**
 * Compile pug source into a plain JSON tree (no code generation, no
 * filesystem).  Includes/extends are emitted as markers, not inlined.
 */
export function tree(str: string, options?: PugTreeOptions): PugTreeNode[];

/* ------------------------------------------------------------------ */
/* Compilation & rendering                                             */
/* ------------------------------------------------------------------ */

/**
 * Compile pug source into a template function.  The returned function
 * renders with `(data, options)` and exposes a `dependencies` array.
 */
export function compile(str: string, options?: PugOptions): PugTemplate;

/**
 * Compile a pug file at `path` into a template function.
 */
export function compileFile(path: string, options?: PugOptions): PugTemplate;

/**
 * Compile pug source for client use, returning both the function body
 * and the set of source files it depends on.
 */
export interface PugClientResult {
  body: string;
  dependencies: string[];
}

export function compileClientWithDependenciesTracked(
  str: string,
  options?: PugOptions
): PugClientResult;

/**
 * Compile pug source for client use, returning just the function body.
 */
export function compileClient(str: string, options?: PugOptions): string;

/**
 * Compile a pug file for client use, returning just the function body.
 */
export function compileFileClient(
  path: string,
  options?: PugOptions
): string;

/** Callback for the async render entry points. */
export interface PugRenderCallback {
  (err: Error | null, result?: string): void;
}

/**
 * Render pug source to an HTML string.  Supports an optional callback
 * form (`err` first, `result` second) alongside the synchronous return.
 */
export function render(str: string, options?: PugOptions): string;
export function render(
  str: string,
  options: PugOptions,
  fn: PugRenderCallback
): void;
export function render(str: string, fn: PugRenderCallback): void;

/**
 * Render a pug file at `path` to an HTML string, with the same
 * synchronous / callback overload set as {@link render}.
 */
export function renderFile(path: string, options?: PugOptions): string;
export function renderFile(
  path: string,
  options: PugOptions,
  fn: PugRenderCallback
): void;
export function renderFile(path: string, fn: PugRenderCallback): void;

/** Express adapter: resolves the template at `path` for Express. */
export function __express(
  path: string,
  options: PugOptions,
  fn: (err: Error | null, body?: string) => void
): void;
