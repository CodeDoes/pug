'use strict';

var makeError = require('pug-error');
var fs = require('fs');
var path = require('path');
var resolve = require('resolve');

function evalExpression(str, name, node) {
  var value;
  try {
    // eslint-disable-next-line no-new-func
    value = new Function('return (' + str + ');')();
  } catch (ex) {
    throw makeError(
      'BUILTIN_FILTER_EVAL',
      'failed to evaluate :' +
        name +
        ' filter block as a JavaScript expression: ' +
        ex.message,
      node || {line: 0, column: 0}
    );
  }
  return value;
}

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attrString(attrs) {
  if (!attrs) {
    return '';
  }
  var out = '';
  Object.keys(attrs).forEach(function(key) {
    var value = attrs[key];
    if (value === null || value === undefined || value === false) {
      return;
    }
    if (value === true) {
      out += ' ' + key;
    } else {
      out += ' ' + key + '="' + escape(value) + '"';
    }
  });
  return out;
}

/**
 * Serialize a single element named `name` holding `value`.
 *
 * `depth` is the indentation level of the element's own opening tag.
 * Children are indented one level deeper.
 */
function elementXML(name, value, depth) {
  var indent = '\n' + new Array(depth + 1).join('  ');
  var open = indent + '<' + name;
  if (value === null || value === undefined) {
    return open + ' />';
  }
  if (Array.isArray(value)) {
    var items = value.map(function(item) {
      return elementXML('item', item, depth + 1);
    });
    return open + '>' + items.join('') + indent + '</' + name + '>';
  }
  if (typeof value === 'object') {
    var children = Object.keys(value).map(function(key) {
      return elementXML(key, value[key], depth + 1);
    });
    return open + '>' + children.join('') + indent + '</' + name + '>';
  }
  return open + '>' + escape(value) + '</' + name + '>';
}

/**
 * :json filter — the block must be a JavaScript expression; the
 * evaluated value is serialized to JSON.
 *
 *   :json()
 *     { foo: 'bar', n: 1 }
 */
function jsonFilter(str, options, node) {
  var value = evalExpression(str, 'json', node);
  var indent =
    options && options.indent !== undefined ? options.indent : undefined;
  return JSON.stringify(value, null, indent);
}

/**
 * :stylus filter — compiles a Stylus stylesheet to CSS.
 *
 *   :stylus
 *     a = #4D90C8
 *     body
 *       color: a
 *
 *   // or include a .styl file:
 *   include:stylus styles/app.styl
 *
 * The filter talks to the `stylus` compiler directly, so it works with
 * just the (small, maintained) `stylus` package installed.  Filter
 * options are applied via `renderer.set()`; a `define` option object is
 * applied via `renderer.define()`, and `import` / `include` / `use`
 * options accept a function or a require-able module name (matching the
 * historical `jstransformer-stylus` behaviour).  `minify` sets
 * stylus' `compress` option.  If `stylus` is not installed, the
 * filter falls back to the legacy `jstransformer-stylus` layer.
 */
function loadStylus(currentDirectory) {
  var stylus;
  try {
    stylus = require(resolve.sync('stylus', {
      basedir: currentDirectory || process.cwd(),
    }));
  } catch (ex) {
    var err = new Error(
      'the ":stylus" filter requires the "stylus" package to be installed'
    );
    err.code = 'BUILTIN_FILTER_FALLBACK';
    throw err;
  }
  return stylus;
}

function stylusFilter(str, options, node, funcName, currentDirectory) {
  var stylus = loadStylus(currentDirectory);
  options = options || {};
  var source = str;
  var filename = null;
  if (funcName === 'renderFile') {
    // include:stylus — `str` is the path of the .styl file
    filename = path.resolve(str);
    source = fs.readFileSync(filename, 'utf8');
  }
  var renderer = stylus(source);
  if (filename) {
    renderer.set('filename', filename);
  }
  Object.keys(options).forEach(function(key) {
    if (
      key === 'filename' ||
      key === 'minify' ||
      key === 'define' ||
      key === 'import' ||
      key === 'include' ||
      key === 'use'
    ) {
      return;
    }
    renderer.set(key, options[key]);
  });
  if (options.minify) {
    renderer.set('compress', true);
  }
  if (options.define) {
    Object.keys(options.define).forEach(function(key) {
      renderer.define(key, options.define[key]);
    });
  }
  ['import', 'include', 'use'].forEach(function(method) {
    var spec = options[method];
    if (spec === undefined) {
      return;
    }
    (Array.isArray(spec) ? spec : [spec]).forEach(function(item) {
      if (typeof item === 'string') {
        // jstransformer-compatible: a string is a require-able module
        item = require(item)();
      }
      renderer[method](item);
    });
  });
  return renderer.render();
}

/**
 * :xml filter — the block must be a JavaScript expression; the
 * evaluated value is serialized to well-formed XML.
 *
 * Objects become nested elements, arrays become repeated `<item>`
 * elements, `null` / `undefined` values become self-closing elements,
 * and everything else becomes escaped text.  The whole result is
 * wrapped in a root element whose name comes from the `root` option
 * (default `"root"`).
 *
 *   :xml(root="user")
 *     { name: "O'Brien", tags: ['a<b', 'c&d'], score: null }
 *
 *   <user>
 *     <name>O&apos;Brien</name>
 *     <tags>
 *       <item>a&lt;b</item>
 *       <item>c&amp;d</item>
 *     </tags>
 *     <score />
 *   </user>
 */
function xmlFilter(str, options, node) {
  var value = evalExpression(str, 'xml', node);
  options = options || {};
  var rootName = options.root || 'root';
  var attrText = attrString(options.attrs);

  if (value === null || value === undefined) {
    return '<' + rootName + attrText + ' />';
  }

  if (Array.isArray(value)) {
    var items = value.map(function(item) {
      return elementXML('item', item, 1);
    });
    return (
      '<' + rootName + attrText + '>' + items.join('') + '\n</' + rootName + '>'
    );
  }
  if (typeof value === 'object') {
    var children = Object.keys(value).map(function(key) {
      return elementXML(key, value[key], 1);
    });
    return (
      '<' +
      rootName +
      attrText +
      '>' +
      children.join('') +
      '\n</' +
      rootName +
      '>'
    );
  }
  return (
    '<' + rootName + attrText + '>' + escape(value) + '</' + rootName + '>'
  );
}

module.exports = {
  json: jsonFilter,
  xml: xmlFilter,
  stylus: stylusFilter,
};
