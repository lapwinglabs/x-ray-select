/**
 * Module Dependencies
 */

var filters = require('./fixtures/filters');
var assert = require('assert');
var Xray = require('..');
var fs = require('fs');

/**
 * Options
 */

describe('options', function() {
  it('should support custom filters', function() {
    var xray = Xray('<a href="mat.io"></a>', { filters: filters });
    assert('MAT.IO' == xray('a[href] | uppercase'));
  });

  it('should support custom filter separator', function() {
    var xray = Xray('<a href="http://mat.io"></a>', { filters: filters, rfilters: /\s*%\s*/ });
    assert('MAT.IO' == xray('a[href] % href % uppercase'));
  });

  it('should support custom attribute selector', function() {
    var xray = Xray('<a href="http://mat.io"></a>', { filters: filters, rselector: /([^\{]+)?(?:\{([^\{]+)\})?/ });
    assert('http://mat.io' == xray('a{href}'));
  });

  it('should support selectorHandler callback', function() {
    var xray = Xray('<a href="http://mat.io"></a>', { 
      filters: filters,
      selectorHandler: function(el, sel, opts) {
        if(sel.fselector == 'mytag') sel.content = 'example';
        return sel;
      }
    });
    var obj = xray({ tag: 'mytag', normal: 'a[href] | href' });
    assert.deepEqual(obj, { tag: 'example', normal: 'mat.io' });
  });

  it('should support objectHandler callback', function() {
    var xray = Xray('<a href="http://mat.io"></a>', { 
      filters: filters,
      objectHandler: function(el, obj, opts) {
        return { obj: obj, content: (obj.$tag ? obj.$tag : undefined) };
      }
    });
    var obj = xray({ custom: { $tag: 'mytag' }, normal: 'a[href] | href' });
    assert.deepEqual(obj, { custom: 'mytag', normal: 'mat.io' });
  });
})
