'use strict';

var assert = require('assert');
var path = require('path');
var builtins = require('../lib/builtins');

var CASES = path.join(__dirname, '..', '..', 'pug', 'test', 'cases');

describe('built-in :stylus filter', function() {
  it('compiles a Stylus block to CSS (byte-stable)', function() {
    assert.strictEqual(
      builtins.stylus('body\n  padding: 50px', {}, undefined, 'render'),
      'body {\n  padding: 50px;\n}\n'
    );
  });

  it('resolves a color defined inline', function() {
    assert.strictEqual(
      builtins.stylus('a = #4D90C8\nbody\n  color: a', {}, undefined, 'render'),
      'body {\n  color: #4d90c8;\n}\n'
    );
  });

  it('applies the minify option via compress', function() {
    assert.strictEqual(
      builtins.stylus(
        'body\n  padding: 50px',
        {minify: true},
        undefined,
        'render'
      ),
      'body{padding:50px}'
    );
  });

  it('applies define options', function() {
    assert.strictEqual(
      builtins.stylus(
        'body\n  color: c',
        {define: {c: '#4D90C8'}},
        undefined,
        'render'
      ),
      "body {\n  color: '#4D90C8';\n}\n"
    );
  });

  it('compiles a .styl file in the renderFile form', function() {
    var file = path.join(CASES, 'some.styl');
    assert.strictEqual(
      builtins.stylus(file, {filename: file}, undefined, 'renderFile', CASES),
      'body {\n  padding: 10px;\n}\n'
    );
  });

  it('resolves @import within a file', function() {
    // some.styl is just `@import "some-included"`; compiling it must
    // pull in the imported stylesheet's rules.
    var file = path.join(CASES, 'some.styl');
    assert.strictEqual(
      builtins.stylus(file, {filename: file}, undefined, 'renderFile', CASES),
      'body {\n  padding: 10px;\n}\n'
    );
  });
});
