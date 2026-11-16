'use strict';

var jstransformer = require('jstransformer');
var resolve = require('resolve');
var builtins = require('./builtins');

module.exports = filter;

function getMinifyTransformerName(outputFormat) {
  switch (outputFormat) {
    case 'js':
      return 'uglify-js';
    case 'css':
      return 'clean-css';
  }
}

function filter(name, str, options, currentDirectory, funcName) {
  funcName = funcName || 'render';
  if (builtins[name]) {
    try {
      return builtins[name](
        str,
        options,
        undefined,
        funcName,
        currentDirectory
      );
    } catch (ex) {
      // A builtin that can't be satisfied (e.g. optional peer dep) can
      // opt into the legacy jstransformer layer by throwing this code.
      if (!ex || ex.code !== 'BUILTIN_FILTER_FALLBACK') {
        throw ex;
      }
    }
  }
  var trPath;
  try {
    try {
      trPath = resolve.sync('jstransformer-' + name, {
        basedir: currentDirectory || process.cwd(),
      });
    } catch (ex) {
      trPath = require.resolve('jstransformer-' + name);
    }
  } catch (ex) {
    var err = new Error('unknown filter ":' + name + '"');
    err.code = 'UNKNOWN_FILTER';
    throw err;
  }
  var tr = jstransformer(require(trPath));
  // TODO: we may want to add a way for people to separately specify "locals"
  var result = tr[funcName](str, options, options).body;
  if (options && options.minify) {
    var minifyTranformer = getMinifyTransformerName(tr.outputFormat);
    if (minifyTranformer) {
      try {
        result = filter(minifyTranformer, result, null, currentDirectory);
      } catch (ex) {
        // better to fail to minify than output nothing
      }
    }
  }
  return result;
}
