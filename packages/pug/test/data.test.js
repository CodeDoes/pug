'use strict';

var assert = require('assert');
var pug = require('../');

describe('pug as data', function() {
  describe('pug.data()', function() {
    it('parses a flat object', function() {
      assert.deepStrictEqual(
        pug.data('config\n  app my-service\n  port 3000'),
        {
          config: {app: 'my-service', port: 3000},
        }
      );
    });

    it('coerces booleans, numbers, and null', function() {
      assert.deepStrictEqual(
        pug.data('a\n  on true\n  off false\n  n 42\n  f 3.14\n  none null'),
        {a: {on: true, off: false, n: 42, f: 3.14, none: null}}
      );
    });

    it('parses nested objects', function() {
      assert.deepStrictEqual(
        pug.data('config\n  limits\n    connections 100\n    timeout 30'),
        {config: {limits: {connections: 100, timeout: 30}}}
      );
    });

    it('parses lists', function() {
      assert.deepStrictEqual(pug.data('tags\n  - one\n  - two\n  - three'), {
        tags: ['one', 'two', 'three'],
      });
    });

    it('parses lists of objects (inline key plus indented children)', function() {
      assert.deepStrictEqual(
        pug.data(
          'items\n  - name a\n    role admin\n    active true\n  - name b\n    role ops'
        ),
        {
          items: [
            {name: 'a', role: 'admin', active: true},
            {name: 'b', role: 'ops'},
          ],
        }
      );
    });

    it('treats a bare key with no children as null (YAML key: semantics)', function() {
      assert.deepStrictEqual(pug.data('settings'), {settings: null});
    });

    it('keeps quoted values as strings', function() {
      assert.deepStrictEqual(pug.data('msg "hello: world"\nn "42"'), {
        msg: 'hello: world',
        n: '42',
      });
    });

    it('ignores blank lines and # comments', function() {
      assert.deepStrictEqual(pug.data('# top\n\ncfg\n  # note\n  x 1'), {
        cfg: {x: 1},
      });
    });

    it('parses a top-level array when lines start with bullets', function() {
      assert.deepStrictEqual(pug.data('- a\n- b\n- c'), ['a', 'b', 'c']);
    });

    it('parses a top-level scalar document', function() {
      assert.deepStrictEqual(pug.data('hello'), {hello: null});
    });

    it('returns null for an empty document', function() {
      assert.strictEqual(pug.data(''), null);
    });

    it('throws on mixed list/object levels', function() {
      assert.throws(function() {
        pug.data('x\n  - item\n  key 1');
      }, /cannot mix list items and object keys/);
    });
  });

  describe('pug.toYaml()', function() {
    it('serializes nested objects with 2-space indentation', function() {
      assert.strictEqual(
        pug.toYaml({config: {app: 'my-service', port: 3000}}),
        'config:\n  app: my-service\n  port: 3000\n'
      );
    });

    it('serializes lists of scalars', function() {
      assert.strictEqual(
        pug.toYaml({tags: ['one', 'two']}),
        'tags:\n  - one\n  - two\n'
      );
    });

    it('serializes lists of objects', function() {
      assert.strictEqual(
        pug.toYaml({items: [{name: 'a', role: 'admin'}]}),
        'items:\n  - name: a\n    role: admin\n'
      );
    });

    it('quotes values that would change type or break YAML', function() {
      assert.strictEqual(
        pug.toYaml({n: '42', t: 'true', msg: 'a: b'}),
        'n: "42"\nt: "true"\nmsg: "a: b"\n'
      );
    });

    it('emits [] for empty arrays and {} for empty objects', function() {
      assert.strictEqual(pug.toYaml({a: [], b: {}}), 'a: []\nb: {}\n');
    });

    it('round-trips through a YAML parser', function() {
      var yaml = require('js-yaml');
      var value = {
        a: 1,
        b: true,
        c: null,
        d: 'text',
        e: ['x', 'y'],
        f: {g: 1, h: [{i: 2}]},
      };
      var parsed = yaml.load(pug.toYaml(value));
      assert.deepStrictEqual(parsed, value);
    });
  });

  describe('pug.renderData()', function() {
    it('parses then serializes to YAML', function() {
      assert.strictEqual(
        pug.renderData('config\n  app my-service\n  tags\n    - a\n    - b'),
        'config:\n  app: my-service\n  tags:\n    - a\n    - b\n'
      );
    });
  });
});
