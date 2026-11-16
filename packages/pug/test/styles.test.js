'use strict';

var assert = require('assert');
var pug = require('../');

// These lock in the native ways of embedding style/script in pug, so the
// behavior is documented by an executable test rather than by prose alone.

describe('style and script embedding (native)', function() {
  it('embeds CSS via a pipeless style block', function() {
    assert.strictEqual(
      pug.render('html\nhead\n  style.\n    body { padding: 50px; }\n'),
      '<html></html><head><style>body { padding: 50px; }</style></head>'
    );
  });

  it('interpolates locals inside a style block', function() {
    assert.strictEqual(
      pug.render('html\nhead\n  style.\n    body { padding: #{n}px; }\n', {
        n: 12,
      }),
      '<html></html><head><style>body { padding: 12px; }</style></head>'
    );
  });

  it('supports style tag attributes (type) with pipeless content', function() {
    assert.strictEqual(
      pug.render(
        'html\nhead\n  style(type="text/css").\n    body { color: red }\n'
      ),
      '<html></html><head><style type="text/css">body { color: red }</style></head>'
    );
  });

  it('embeds script via a pipeless script block', function() {
    // pipeless block content is NOT escaped — `<` passes through literally
    assert.strictEqual(
      pug.render('html\nbody\n  script.\n    var x = 1 < 2; if (x) {}\n'),
      '<html></html><body><script>var x = 1 < 2; if (x) {}</script></body>'
    );
  });

  it('renders an inline style attribute from a string', function() {
    assert.strictEqual(
      pug.render('html\nbody\n  p(style="color: red") x\n'),
      '<html></html><body><p style="color: red">x</p></body>'
    );
  });

  it('renders an inline style attribute from an object of locals', function() {
    assert.strictEqual(
      pug.render('html\nbody\n  p(style={color: c, fontSize: px}) x\n', {
        c: 'red',
        px: '12px',
      }),
      '<html></html><body><p style="color:red;fontSize:12px;">x</p></body>'
    );
  });

  it('emits raw, un-escaped content via the :cdata filter', function() {
    assert.strictEqual(
      pug.render('div\n  :cdata\n    <raw>\n'),
      '<div><![CDATA[<raw>]]></div>'
    );
  });
});
