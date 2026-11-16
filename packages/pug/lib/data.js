'use strict';

/**
 * "Pug as data" — a small, self-contained YAML-like data format
 * expressed in pug's indentation style.
 *
 * A document is a tree of lines.  Nesting is expressed purely by
 * indentation (spaces or tabs).  Three constructs:
 *
 *   - `key`                  — opens an object node; its indented
 *                              children become its fields.  A bare key
 *                              with no value and no children is `null`
 *                              (YAML `key:` semantics).
 *   - `key value...`         — a scalar field (or `key: value...`).
 *                              The value is coerced: true/false,
 *                              integers/floats, null/~, otherwise a
 *                              string.  Quoting the value keeps it a
 *                              string.
 *   - `- item` / `* item` / `+ item` — a list item.  A node whose
 *                              children are all bullets becomes an
 *                              Array.  A bullet with inline text plus
 *                              indented children becomes an object
 *                              whose first field is that inline text.
 *
 * Blank lines and lines whose first non-space character is `#` are
 * ignored.
 *
 * This reuses pug's whitespace-tree idiom for describing data and can
 * serialize to YAML (see `toYaml`).
 */

var BULLET = /^[-*+]\s+/;
var BULLET_BARE = /^[-*+]$/;
var QUOTED = /^(['"])([\s\S]*)\1$/;

function isBlank(line) {
  return line.trim() === '';
}

function isComment(line) {
  var t = line.trim();
  return t.charAt(0) === '#';
}

function indentOf(line) {
  var match = line.match(/^[ \t]*/)[0];
  var n = 0;
  for (var i = 0; i < match.length; i++) {
    n += match.charAt(i) === '\t' ? 4 : 1;
  }
  return n;
}

function coerce(val) {
  var s = String(val).trim();
  var m = QUOTED.exec(s);
  if (m) {
    return m[2];
  }
  if (s === 'true') {
    return true;
  }
  if (s === 'false') {
    return false;
  }
  if (s === 'null' || s === '~') {
    return null;
  }
  if (s !== '' && s !== 'Infinity' && s !== '-Infinity' && isFinite(s)) {
    return Number(s);
  }
  return s;
}

/**
 * Split a `key value` (or `key: value`) line into [key, valueSource].
 * The earliest of a colon or space is the separator.  A key with no
 * value returns [key, ''].
 */
function splitKeyValue(text) {
  var colon = text.indexOf(':');
  var space = text.indexOf(' ');
  var cut;
  if (colon === -1) {
    cut = space;
  } else if (space === -1) {
    cut = colon;
  } else {
    cut = Math.min(colon, space);
  }
  if (cut === -1) {
    return [text, ''];
  }
  return [text.slice(0, cut).trim(), text.slice(cut + 1).trim()];
}

function parseBlock(lines, start, indent) {
  // Parse a run of sibling lines at exactly `indent`; returns [value, next].
  var isList =
    BULLET.test(lines[start].text) || BULLET_BARE.test(lines[start].text);
  var obj = {};
  var arr = [];
  var i = start;

  while (i < lines.length) {
    var entry = lines[i];
    if (entry.indent < indent) {
      break;
    }
    if (entry.indent > indent) {
      throw new Error(
        'unexpected indent on data line ' +
          (i + 1) +
          ' (indent ' +
          entry.indent +
          ' expected ' +
          indent +
          ')'
      );
    }

    var text = entry.text;
    var bullet = BULLET.exec(text);
    var isItem = bullet || BULLET_BARE.test(text);

    if (isList !== !!isItem) {
      if (i === start) {
        // first line decides; if it disagrees, re-decide
        isList = !!isItem;
      } else {
        throw new Error(
          'cannot mix list items and object keys at the same level (line ' +
            (i + 1) +
            ')'
        );
      }
    }

    if (isItem) {
      var inline = bullet ? text.slice(bullet[0].length).trim() : '';
      var hasChildren = lines[i + 1] && lines[i + 1].indent > indent;
      var value;
      if (inline === '' && hasChildren) {
        // bullet is a container; its children form the node
        var p = parseBlock(lines, i + 1, lines[i + 1].indent);
        value = p[0];
        i = p[1];
      } else if (inline !== '' && hasChildren) {
        // object item: first field is the inline key/value, then children
        var itemObj = {};
        var kv = splitKeyValue(inline);
        if (kv[1] === '' && lines[i + 1] && lines[i + 1].indent > indent) {
          // inline was a bare key that opens the object
          var pc = parseBlock(lines, i + 1, lines[i + 1].indent);
          itemObj[kv[0]] = pc[0];
          i = pc[1];
        } else {
          itemObj[kv[0]] = coerce(kv[1]);
          // merge any deeper children as extra fields
          var cc = parseBlock(lines, i + 1, lines[i + 1].indent);
          if (cc[0] && typeof cc[0] === 'object') {
            for (var k in cc[0]) {
              itemObj[k] = cc[0][k];
            }
            i = cc[1];
          } else {
            i++;
          }
        }
        value = itemObj;
      } else {
        value = inline === '' ? null : coerce(inline);
        i++;
      }
      arr.push(value);
      continue;
    }

    // object field
    var keyval = splitKeyValue(text);
    var key = keyval[0];
    var valSrc = keyval[1];
    if (valSrc === '') {
      var child = lines[i + 1];
      if (child && child.indent > indent) {
        var pn = parseBlock(lines, i + 1, child.indent);
        obj[key] = pn[0];
        i = pn[1];
      } else {
        obj[key] = null;
        i++;
      }
    } else {
      obj[key] = coerce(valSrc);
      i++;
    }
  }

  var out = isList ? arr : obj;
  return [out, i];
}

/**
 * Parse a pug-style data document into a plain value.
 *
 * @param {String} str
 * @return {Object|Array|String|Number|Boolean|null}
 */
function data(str) {
  str = String(str);
  var lines = str
    .split(/\r?\n/)
    .map(function(l) {
      return l.replace(/\s+$/, '');
    })
    .filter(function(l) {
      return !isBlank(l) && !isComment(l);
    })
    .map(function(l) {
      return {indent: indentOf(l), text: l.trim()};
    });

  if (!lines.length) {
    return null;
  }

  var parsed = parseBlock(lines, 0, lines[0].indent);
  if (parsed[1] !== lines.length) {
    throw new Error('trailing content could not be parsed');
  }
  return parsed[0];
}

function scalarYaml(v) {
  if (v === null) {
    return 'null';
  }
  if (typeof v === 'boolean' || typeof v === 'number') {
    return String(v);
  }
  var s = String(v);
  if (s === '') {
    return "''";
  }
  // Quote when a YAML plain-scalar reader would re-coerce this text to a
  // non-string: numbers (incl. hex/octal/binary/exponent) and the reserved
  // words true/false/null/~.  Bare y/n/yes/no/on/off are plain strings in
  // YAML 1.2, so they do not need quoting.  Special indicator characters
  // also force quotes.
  var looksNumeric = /^[-+]?(0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+\.?\d*(e[-+]?\d+)?|\.\d+(e[-+]?\d+)?|inf|nan)$/i.test(
    s
  );
  var looksReserve = /^(true|false|null|~)$/i.test(s);
  var needsQuote =
    /^\s|\s$/.test(s) ||
    looksNumeric ||
    looksReserve ||
    /[:#{}[\],&*!|>'"%@`]/.test(s);
  if (needsQuote) {
    return JSON.stringify(s);
  }
  return s;
}

function yamlLines(value, indent, buf) {
  var pad = ' '.repeat(indent);
  if (value === null || value === undefined) {
    buf.push(pad + 'null');
    return;
  }
  if (typeof value !== 'object') {
    buf.push(pad + scalarYaml(value));
    return;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      buf.push(pad + '[]');
      return;
    }
    value.forEach(function(item) {
      if (item !== null && typeof item === 'object') {
        var itemBuf = [];
        yamlLines(item, indent + 2, itemBuf);
        // first line replaces the leading indent after "- "
        buf.push(pad + '- ' + itemBuf[0].slice(indent + 2));
        for (var k = 1; k < itemBuf.length; k++) {
          buf.push(itemBuf[k]);
        }
      } else {
        buf.push(pad + '- ' + scalarYaml(item));
      }
    });
    return;
  }
  var keys = Object.keys(value);
  if (!keys.length) {
    buf.push(pad + '{}');
    return;
  }
  keys.forEach(function(k) {
    var v = value[k];
    var key = scalarYaml(k);
    if (Array.isArray(v)) {
      if (!v.length) {
        buf.push(pad + key + ': []');
      } else {
        buf.push(pad + key + ':');
        yamlLines(v, indent + 2, buf);
      }
    } else if (v !== null && typeof v === 'object') {
      if (!Object.keys(v).length) {
        buf.push(pad + key + ': {}');
      } else {
        buf.push(pad + key + ':');
        yamlLines(v, indent + 2, buf);
      }
    } else {
      buf.push(pad + key + ': ' + scalarYaml(v));
    }
  });
}

/**
 * Serialize a plain JS value to a YAML string (2-space indents).
 *
 * @param {*} value
 * @return {String}
 */
function toYaml(value) {
  var buf = [];
  yamlLines(value, 0, buf);
  return buf.join('\n') + '\n';
}

/**
 * Parse a pug-style data document and serialize it to YAML.
 *
 * @param {String} str
 * @return {String}
 */
function renderData(str) {
  return toYaml(data(str));
}

module.exports = {
  data: data,
  toYaml: toYaml,
  renderData: renderData,
};
