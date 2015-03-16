/**
 * Module Dependencies
 */

var filters = require('./fixtures/filters');
var m = require('multiline').stripIndent;
var cheerio = require('cheerio');
var join = require('path').join;
var assert = require('assert');
var Xray = require('..');
var fs = require('fs');

/**
 * Strings
 */

describe('strings selectors', function() {
  it('should work with strings', function() {
    var xray = Xray('<a href="mat.io"></a>');
    assert('mat.io' == xray('a[href]'));
  })

  it('should support [html] to get the innerHTML', function() {
    var xray = Xray('<body><h2>hello world</h2></body>');
    assert('<h2>hello world</h2>' == xray('body[html]'));
  });

  it('should support when cheerio instances are passed in', function() {
    var xray = Xray(cheerio.load('<a href="mat.io"></a>'));
    assert('mat.io' == xray('a[href]'));
  });

  it('should support filters', function() {
    var xray = Xray('<a href="https://mat.io"></a>', filters);
    assert('mat.io' == xray('a[href]|href'));
  });

  it('should support multiple filters', function() {
    var xray = Xray('<a href="https://mat.io"></a>', filters);
    assert('MAT.IO' == xray('a[href]|href|uppercase'));
  });

  it('should support filters with arguments', function() {
    var xray = Xray('<a href="https://mat.io/rss"></a>', filters);
    assert.deepEqual(['mat.io', 'rss'], xray('a[href]|href|split:/'));
  })

  it('should return undefined if nothing is false', function() {
    var xray = Xray('<a href="mat.io"></a>');
    assert(undefined === xray('.zzzzz'));
  })

  it('should support falsy values from filters', function() {
    var xray = Xray('<a href="http://mat.io"></a>', filters);
    assert(false === xray('a[href]|secure'));
  })
})
