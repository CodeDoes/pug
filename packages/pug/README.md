<!-- Coppied from root directory -->

<a href="https://pugjs.org"><img src="https://cdn.rawgit.com/pugjs/pug-logo/eec436cee8fd9d1726d7839cbe99d1f694692c0c/SVG/pug-final-logo-_-colour-128.svg" height="200" align="right"></a>
# Pug

Full documentation is at [pugjs.org](https://pugjs.org/)

 Pug is a high performance template engine heavily influenced by [Haml](http://haml.info/)
 and implemented with JavaScript for [Node.js](http://nodejs.org) and browsers. For bug reports,
 feature requests and questions, [open an issue](https://github.com/pugjs/pug/issues/new).
 For discussion join the [chat room](https://gitter.im/pugjs/pug).

 You can test drive Pug online [here](https://pugjs.org/).

 [![Build Status](https://img.shields.io/travis/pugjs/pug/master.svg?style=flat)](https://travis-ci.org/pugjs/pug)
 [![Coverage Status](https://img.shields.io/coveralls/pugjs/pug/master.svg?style=flat)](https://coveralls.io/r/pugjs/pug?branch=master)
 [![Dependency Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug)](https://david-dm.org/pugjs/pug?path=packages/pug)
 [![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug)](https://david-dm.org/pugjs/pug?path=packages/pug&type=dev)
 [![NPM version](https://img.shields.io/npm/v/pug.svg?style=flat)](https://www.npmjs.com/package/pug)
 [![Join Gitter Chat](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg?style=flat)](https://gitter.im/pugjs/pug?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Rename from "Jade"

This project was formerly known as "Jade." However, it has been revealed to us that "Jade" is a registered trademark, and as a result a rename is needed. After some discussion among the maintainers, **"Pug"** has been chosen as the new name for this project. The next major version will carry "pug" as the package name.

If your package or app currently uses `jade`, don't worry: we have secured permissions to continue to occupy that package name, although all new versions will be released under `pug`.

Before the renaming, we had already begun working on an incompatible Jade 2.0.0. We have then made it so that this new major version bump will coincide with the rename to Pug. Therefore, upgrading from Jade to Pug will be the same process as upgrading any other package with a major version bump. Currently, Pug 2.0.0 is still under beta stage, and there are several syntactic differences we have deprecated and removed. Such differences are documented at [#2305](https://github.com/pugjs/pug/issues/2305).

The website and documentation for Pug are still being updated, but if you are new to Pug, you should get started with the new syntax and install the Pug package on npm.

## Installation

### Package

via npm:

```bash
$ npm install pug
```

### Command Line

After installing the latest version of [Node.js](http://nodejs.org/), install with:

```bash
$ npm install pug-cli -g
```

and run with

```bash
$ pug --help
```

## Syntax

Pug is a clean, whitespace sensitive syntax for writing html.  Here is a simple example:

```pug
doctype html
html(lang="en")
  head
    title= pageTitle
    script(type='text/javascript').
      if (foo) bar(1 + 5)
  body
    h1 Pug - node template engine
    #container.col
      if youAreUsingPug
        p You are amazing
      else
        p Get on it!
      p.
        Pug is a terse and simple templating language with a
        strong focus on performance and powerful features.
```

becomes


```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Pug</title>
    <script type="text/javascript">
      if (foo) bar(1 + 5)
    </script>
  </head>
  <body>
    <h1>Pug - node template engine</h1>
    <div id="container" class="col">
      <p>You are amazing</p>
      <p>Pug is a terse and simple templating language with a strong focus on performance and powerful features.</p>
    </div>
  </body>
</html>
```

## API

For full API, see [pugjs.org/api/reference.html](https://pugjs.org/api/reference.html)

```js
var pug = require('pug');

// compile
var fn = pug.compile('string of pug', options);
var html = fn(locals);

// render
var html = pug.render('string of pug', merge(options, locals));

// renderFile
var html = pug.renderFile('filename.pug', merge(options, locals));

// pug as data
var obj = pug.data('config\n  app my-service\n  port 3000');
var yaml = pug.renderData('config\n  app my-service\n  port 3000');
```

### Options

 - `filename`  Used in exceptions, and required when using includes
 - `compileDebug`  When `false` no debug instrumentation is compiled
 - `pretty`    Add pretty-indentation whitespace to output _(false by default)_
### Pug as data

Pug's indentation already describes trees, so the same syntax can
describe **data**. Three helpers are exported:

```js
// parse an indented document into a plain JS value
pug.data('config\n  app my-service\n  debug true\n  port 3000\n  tags\n    - a\n    - b')
// => { config: { app: 'my-service', debug: true, port: 3000,
//                tags: ['a', 'b'] } }

// same, but serialized straight to YAML
pug.renderData(doc)
// => "config:\n  app: my-service\n  debug: true\n  port: 3000\n  tags:\n    - a\n    - b\n"

// serialize any plain JS value to YAML
pug.toYaml({ name: 'pug', version: 2 })
// => "name: pug\nversion: 2\n"
```

Data grammar:

 - Nesting is indentation only (spaces or tabs).
 - `key` opens an object; its indented children become fields.
 - `key value` (or `key: value`) is a scalar field; values coerce to
   `true`/`false`, numbers, `null`/`~`, or strings (quote to force a
   string).
 - `- item` (also `*`/`+`) is a list item; a node whose children are all
   bullets becomes an array.  A bullet with inline text plus indented
   children becomes an object.
 - Blank lines and `#` comments are ignored.

This is a small, self-contained format (no external dependency); it is
*not* a full YAML parser/serializer, just the tree-shaped subset that
pug's whitespace idiom naturally expresses.

### Pug as tree

`pug.data()` coerces an indented document into JSON/YAML.  When you want
to keep the **structure** instead — tags, attributes, loops, conditionals
— use `pug.tree()`.  It runs lex + parse only (no codegen, no filesystem)
and returns an array of plain node objects, so a game engine, editor, or
design tool can consume an authored pug document directly:

```js
pug.tree([
  'card_game',
  '  hand(owner="other")',
  '    card(card=Hidden)',
  '  field',
  '    row(type="active", owner="player")',
].join('\n'))
// [ { tag: 'card_game', attrs: {},
//     children: [
//       { tag: 'hand', attrs: { owner: 'other' },
//         children: [ { tag: 'card', attrs: { card: 'Hidden' }, children: [] } ] },
//       { tag: 'field', attrs: {}, children: [
//           { tag: 'row', attrs: { type: 'active', owner: 'player' }, children: [] } ] } ] } ]
```

Node shapes (one key each): `{ tag, attrs, children }`, `{ text }`,
`{ code, buffer }`, `{ each }`, `{ if }`, `{ while }`, `{ case }`,
`{ filter }`, `{ include }` / `{ extends }` / `{ rawInclude }` (markers,
not inlined), `{ doctype }`, `{ comment }`, `{ mixin }` / `{ use }`,
`{ yield }`.  Attribute values are normalized (quotes stripped, repeated
names merged into arrays).  Pass `{ positions: true }` to add `line` /
`column` to every node.

This is what turns the app-layout sketches (card game, dashboard, editor,
...) into machine-consumable trees: pug stays the authoring language, and
any consumer reads the JSON.

### Styles and scripts

Embed CSS/JS with a **pipeless block** (`style.` / `script.`).  The
content is written literally into the element, and `#{}` interpolation
works inside it:

```pug
html
  head
    style.
      body { padding: #{n}px; }
  body
    script.
      var x = 1;
```

Inline (element-attribute) styles are also native:

```pug
p(style="color: red") hello
p(style={color: c, fontSize: px}) hello
```

For fully verbatim (un-escaped) content use the `:cdata` filter, e.g.
a `:cdata` filter block wrapping the content:

```pug
div
  :cdata
    <verbatim>
```

## Browser Support

 The latest version of pug can be download for the browser in standalone form from [here](https://pugjs.org/js/pug.js).  It only supports the very latest browsers though, and is a large file.  It is recommended that you pre-compile your pug templates to JavaScript.

 To compile a template for use on the client using the command line, do:

```bash
$ pug --client --no-debug filename.pug
```

which will produce `filename.js` containing the compiled template.

## Additional Resources

Tutorials:

  - cssdeck interactive [Pug syntax tutorial](http://cssdeck.com/labs/learning-the-jade-templating-engine-syntax)
  - cssdeck interactive [Pug logic tutorial](http://cssdeck.com/labs/jade-templating-tutorial-codecast-part-2)
  - [Pug について。](https://gist.github.com/japboy/5402844) (A Japanese Tutorial)

Implementations in other languages:

  - [Larpug - Pug for Laravel](https://github.com/acidjazz/larpug)
  - [php](https://github.com/pug-php/pug)
  - [scala](https://scalate.github.io/scalate/documentation/scaml-reference.html)
  - [ruby](https://github.com/slim-template/slim)
  - [python](https://github.com/SyrusAkbary/pyjade)
  - [java](https://github.com/neuland/jade4j)

Other:

  - [Emacs Mode](https://github.com/brianc/jade-mode)
  - [Vim Syntax](https://github.com/digitaltoad/vim-pug)
  - [TextMate Bundle](http://github.com/miksago/jade-tmbundle)
  - [Coda/SubEtha syntax Mode](https://github.com/aaronmccall/jade.mode)
  - [html2pug](https://github.com/donpark/html2jade) converter
  - [pug2php](https://github.com/SE7ENSKY/jade2php) converter
  - [Pug Server](https://github.com/ded/jade-server)  Ideal for building local prototypes apart from any application
  - [pug-ruby](https://github.com/yivo/pug-ruby) gem: Allows to invoke Pug and Jade from Ruby
  - [pug-rails](https://github.com/yivo/pug-rails) gem: Integrates Pug and Jade into your Rails application

## License

MIT
