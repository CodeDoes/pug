'use strict';

var assert = require('assert');
var pug = require('../');

function tree(src, options) {
  return pug.tree(src, options);
}

describe('pug.tree()', function() {
  it('emits nested tag nodes with normalized attributes', function() {
    var t = tree(
      [
        'card_game',
        '  hand(owner="other")',
        '    card(card=Hidden)',
        '    card(card=Hidden)',
        '  field',
        '    side',
        '      deck-slot(owner="other", card_count=32)',
      ].join('\n')
    );
    assert.strictEqual(t.length, 1);
    assert.strictEqual(t[0].tag, 'card_game');
    var hand = t[0].children[0];
    assert.strictEqual(hand.tag, 'hand');
    // quoted value is unquoted, bare expr value is kept as source
    assert.deepStrictEqual(hand.attrs, {owner: 'other'});
    assert.strictEqual(hand.children.length, 2);
    assert.deepStrictEqual(hand.children[0], {
      tag: 'card',
      attrs: {card: 'Hidden'},
      children: [],
    });
    var deck = t[0].children[1].children[0].children[0];
    assert.strictEqual(deck.tag, 'deck-slot');
    assert.deepStrictEqual(deck.attrs, {owner: 'other', card_count: '32'});
  });

  it('merges duplicate attribute names into arrays', function() {
    var t = tree('a(class="x")(class="y")');
    assert.deepStrictEqual(t[0].attrs.class, ['x', 'y']);
  });

  it('maps the loop / control / block node types', function() {
    var t = tree(
      [
        'list',
        '  each i, idx in items',
        '    li(index=idx) = i',
        '  if x > 1',
        '    .long',
        '  else',
        '    .short',
        '  while x < 3',
        '    .step',
        '  case y',
        '    when 1',
        '      .one',
        '    default',
        '      .many',
      ].join('\n')
    );
    var list = t[0];
    var each = list.children[0];
    assert.deepStrictEqual(each.each, {key: 'idx', val: 'i', obj: 'items'});
    assert.strictEqual(each.children.length, 1);

    var cond = list.children[1];
    assert.strictEqual(cond.if, 'x > 1');
    assert.strictEqual(cond.children.length, 1);
    assert.strictEqual(cond.else.length, 1);

    var whileNode = list.children[2];
    assert.strictEqual(whileNode.while, 'x < 3');

    var caseNode = list.children[3];
    assert.strictEqual(caseNode.case, 'y');
    assert.strictEqual(caseNode.when.length, 2);
    assert.strictEqual(caseNode.when[0].test, '1');
    assert.strictEqual(caseNode.when[1].test, 'default');
    assert.strictEqual(caseNode.when[1].children.length, 1);
  });

  it('maps each-of to the object form', function() {
    var t = tree(['ul', '  each item of list', '    li = item'].join('\n'));
    assert.deepStrictEqual(t[0].children[0].each, {
      val: 'item',
      obj: 'list',
    });
  });

  it('maps text, code, and interpolation nodes', function() {
    var t = tree(['- var n = 3', 'span', '  | text #{interp} more'].join('\n'));
    assert.deepStrictEqual(t[0], {code: 'var n = 3', buffer: false});
    var span = t[1];
    assert.strictEqual(span.tag, 'span');
    assert.deepStrictEqual(span.children[0], {text: 'text '});
    assert.deepStrictEqual(span.children[1], {
      code: 'interp',
      buffer: true,
    });
    assert.deepStrictEqual(span.children[2], {text: ' more'});
  });

  it('maps mixin definitions and calls', function() {
    var t = tree(
      ['mixin item(label)', '  .item(label=label)', '+item("one")'].join('\n')
    );
    var def = t[0];
    assert.deepStrictEqual(def.mixin, {name: 'item', params: 'label'});
    assert.strictEqual(def.children.length, 1);
    var call = t[1];
    assert.deepStrictEqual(call.use, {name: 'item', args: '"one"'});
    assert.deepStrictEqual(call.attrs, {});
  });

  it('maps filters, comments, doctype, and include', function() {
    var t = tree(
      [
        'doctype xml',
        'pre',
        '  :cdata',
        '    <verbatim>',
        '//- a comment',
      ].join('\n')
    );
    assert.deepStrictEqual(t[0], {doctype: 'xml'});
    assert.strictEqual(t[1].tag, 'pre');
    assert.strictEqual(t[1].children[0].filter, 'cdata');
    assert.strictEqual(t[1].children[0].children[0].text, '<verbatim>');
    assert.strictEqual(t[2].comment, ' a comment');
  });

  it('maps attributeBlocks (&attributes) on tags', function() {
    var t = tree('div&attributes(attrs)');
    assert.strictEqual(t[0].attrs['&attributes'], 'attrs');
  });

  it('adds positions when requested', function() {
    var t = tree('p', {positions: true});
    assert.strictEqual(typeof t[0].line, 'number');
    assert.strictEqual(typeof t[0].column, 'number');
  });

  it('returns an empty array for an empty document', function() {
    assert.deepStrictEqual(tree(''), []);
  });

  it('maps include/extends as markers (no filesystem)', function() {
    assert.deepStrictEqual(pug.tree('include ./x.pug'), [{include: './x.pug'}]);
    assert.deepStrictEqual(pug.tree('extends base.pug'), [
      {extends: 'base.pug'},
    ]);
    assert.deepStrictEqual(pug.tree('include:stylus some.styl'), [
      {rawInclude: 'some.styl', filters: ['stylus']},
    ]);
  });

  it('collapses piped and literal-block script/style into a single body string', function() {
    var piped = pug.tree(
      [
        'html',
        '  head',
        '    script',
        '      | x = 1',
        '      | alert(x)',
      ].join('\n')
    );
    var script = piped[0].children[0].children[0];
    assert.strictEqual(script.tag, 'script');
    assert.strictEqual(script.body, 'x = 1\nalert(x)');
    assert.ok(!('children' in script));

    var literal = pug.tree(
      [
        'html',
        '  head',
        '    script.',
        '      if (foo) {',
        '        bar();',
        '      }',
      ].join('\n')
    );
    assert.strictEqual(
      literal[0].children[0].children[0].body,
      'if (foo) {\n  bar();\n}'
    );
  });

  it('keeps children (no body) for a script that holds markup', function() {
    var t = pug.tree('body\n  script\n    div\n');
    var script = t[0].children[0];
    assert.strictEqual(script.tag, 'script');
    assert.ok(!('body' in script));
    assert.deepStrictEqual(script.children, [
      {tag: 'div', attrs: {}, children: []},
    ]);
  });

  it('splits a leading :filter out of the tag name', function() {
    var t = pug.tree('head\n  script:coffee\n    x = 1\n');
    var script = t[0].children[0];
    assert.strictEqual(script.tag, 'script');
    assert.strictEqual(script.filter, 'coffee');
  });
});
