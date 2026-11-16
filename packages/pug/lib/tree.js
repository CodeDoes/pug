'use strict';

var lex = require('pug-lexer');
var parse = require('pug-parser');
var makeError = require('pug-error');

/**
 * "Pug as tree" — compile a pug document into a plain JSON tree.
 *
 * `pug.tree(str)` returns an array of node objects.  Each node has one
 * type-specific key plus a `children` array for container nodes:
 *
 *   { tag: 'hand', attrs: { owner: 'other' },
 *     children: [ { tag: 'card', attrs: { card: 'Hidden' }, children: [] } ] }
 *
 * This is the *authored* document structure — a pure source-to-JSON
 * transform (lex + parse).  `include` / `extends` are emitted as
 * markers, not inlined, so no filesystem access is needed:
 *
 *   { include: './child.pug' }
 *   { extends: 'base.pug' }
 *
 * Node shapes (one key each):
 *
 *   tag             { tag, attrs, children }      ({ tagExpr } when the
 *                                                   name is an expression)
 *   text            { text }
 *   code            { code, buffer }              (buffer → inlines the value)
 *   each            { each: { key, val, obj }, children }
 *   each-of         { each: { val, obj }, children }
 *   conditional     { if: test, children, else?: [...] }
 *   while           { while: test, children }
 *   case            { case: test, when: [{ test, children }], else?: [...] }
 *   filter          { filter: name, attrs, children }
 *   raw-include     { rawInclude: path, filters: [names] }
 *   include         { include: path }
 *   extends         { extends: path }
 *   doctype         { doctype }
 *   comment         { comment, children }
 *   block-comment   { blockComment, children }
 *   named-block     { block: name, children }
 *   mixin           { mixin: { name, params }, children }   (definition)
 *   use             { use: { name, args }, attrs }           (+name call)
 *   yield           { yield: 'block' | 'content' }
 *
 * Attribute values are normalized: quoted values are unquoted
 * (`"foo"` / `'foo'` → `foo`); expression values are kept as their
 * source text.  Repeated attribute names merge into an array.
 *
 * @param {String} str pug source
 * @param {Object} [options]
 * @param {Boolean} [options.positions] add `line`/`column` to every node
 * @return {Array} tree of node objects
 */
function tree(str, options) {
  options = options || {};
  var tokens = lex(String(str), {filename: options.filename});
  var ast = parse(tokens, options);
  var positions = options.positions === true;
  return (ast.nodes || []).map(function(node) {
    return toTree(node, positions);
  });
}

function toTree(node, positions) {
  var out;
  switch (node.type) {
    case 'Tag':
    case 'InterpolatedTag':
      out = {};
      if (node.type === 'InterpolatedTag') {
        out.tagExpr = node.expr;
      } else {
        out.tag = node.name;
      }
      out.attrs = attrsToMap(
        node.attrs,
        node.attributeBlocks,
        node.selfClosing
      );
      out.children = childrenOf(node.block, positions);
      break;
    case 'Text':
      out = {text: node.val};
      break;
    case 'Code':
      out = {code: node.val, buffer: node.buffer === true};
      break;
    case 'Each':
      out = {
        each: {
          key: node.key || undefined,
          val: node.val,
          obj: node.obj,
        },
        children: childrenOf(node.block, positions),
      };
      break;
    case 'EachOf':
      out = {
        each: {val: node.val, obj: node.obj},
        children: childrenOf(node.block, positions),
      };
      break;
    case 'Conditional':
      out = {
        if: node.test,
        children: childrenOf(node.consequent, positions),
      };
      if (node.alternate) {
        out.else = childrenOf(node.alternate, positions);
      }
      break;
    case 'While':
      out = {
        while: node.test,
        children: childrenOf(node.block, positions),
      };
      break;
    case 'Case':
      out = {
        case: node.expr,
        when: ((node.block && node.block.nodes) || []).map(function(when) {
          return {
            test: when.expr === 'default' ? 'default' : when.expr,
            children: childrenOf(when.block, positions),
          };
        }),
      };
      if (node.alternate) {
        out.else = childrenOf(node.alternate, positions);
      }
      break;
    case 'Filter':
      out = {
        filter: node.name,
        attrs: attrsToMap(node.attrs || [], []),
        children: childrenOf(node.block, positions),
      };
      break;
    case 'RawInclude':
      out = {
        rawInclude: node.file && node.file.path,
        filters: (node.filters || []).map(function(filter) {
          return filter.name;
        }),
      };
      break;
    case 'Include':
      out = {include: node.file && node.file.path};
      break;
    case 'Extends':
      out = {extends: node.file && node.file.path};
      break;
    case 'Doctype':
      out = {doctype: node.val};
      break;
    case 'Comment':
      out = {comment: node.val, children: childrenOf(node.block, positions)};
      break;
    case 'BlockComment':
      out = {
        blockComment: node.val,
        children: childrenOf(node.block, positions),
      };
      break;
    case 'NamedBlock':
      out = {
        block: node.name,
        children: (node.nodes || []).map(function(n) {
          return toTree(n, positions);
        }),
      };
      break;
    case 'Mixin':
      if (node.call === true) {
        out = {
          use: {
            name: node.name,
            args:
              node.args !== null && node.args !== undefined
                ? node.args
                : undefined,
          },
          attrs: attrsToMap(node.attrs || [], node.attributeBlocks || []),
        };
      } else {
        out = {
          mixin: {name: node.name, params: node.args},
          children: childrenOf(node.block, positions),
        };
      }
      break;
    case 'MixinBlock':
      out = {yield: 'block'};
      break;
    case 'YieldBlock':
      out = {yield: 'content'};
      break;
    default:
      throw makeError(
        'TREE_UNKNOWN_NODE',
        'pug.tree: unsupported node type "' + node.type + '"',
        node
      );
  }
  if (positions) {
    out.line = node.line;
    out.column = node.column;
  }
  return out;
}

function childrenOf(block, positions) {
  if (!block || !block.nodes) {
    return [];
  }
  return block.nodes.map(function(node) {
    return toTree(node, positions);
  });
}

/**
 * Turn an attribute list (plus `&attributes` blocks) into a plain
 * object.  Quoted values are unquoted; expression values are kept as
 * their source; duplicate keys merge into arrays (order preserved).
 */
function attrsToMap(attrs, attributeBlocks, selfClosing) {
  var map = {};
  function add(key, value) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      if (!Array.isArray(map[key])) {
        map[key] = [map[key]];
      }
      map[key].push(value);
    } else {
      map[key] = value;
    }
  }
  (attrs || []).forEach(function(attr) {
    add(attr.name, normalizeAttrValue(attr.val));
  });
  (attributeBlocks || []).forEach(function(block) {
    add('&attributes', block.val);
  });
  if (selfClosing === true) {
    add('&selfClosing', true);
  }
  return map;
}

function normalizeAttrValue(val) {
  var v = String(val).trim();
  var q = v.charAt(0);
  if (
    v.length >= 2 &&
    (q === '"' || q === "'") &&
    v.charAt(v.length - 1) === q
  ) {
    return v.slice(1, -1);
  }
  return v;
}

module.exports = tree;
