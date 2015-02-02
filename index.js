/**
 * Module Dependencies
 */

var type = require('component-type');
var cheerio = require('cheerio');
var isArray = Array.isArray;
var keys = Object.keys;

/**
 * x-ray
 */

module.exports = Xray;

/**
 * Regexps
 */

var rselector = /([^\[]+)(?:\[([^\[]+)\])?/;
var rfilters = /\s*\|\s*/;

/**
 * x-ray
 *
 * @param {String} html
 * @param {Object} filters
 * @return {xray}
 * @api public
 */

function Xray(html, filters) {
  filters = filters || {};
  html = html || '';

  var $ = cheerio.load(html);
  var $root = $.root();

  function xray(obj, root) {
    root = root || $root;

    // switch between the types of objects
    switch(type(obj)) {
      case 'array': return obj.reduce(collection, []);
      case 'string': return findMany(root, obj)[0];
      case 'object': return fill(obj);
    }

    // create a collection
    function collection(arr, v) {
      switch (type(v)) {
        case 'string': return arr.concat(findMany(root, v));
        case 'object': return fillMany(v);
      }
    }

    // find many elements
    function findMany($el, str) {
      if ('string' != type(str)) return [xray(str, $el)];
      var m = parse(str);

      return $el.find(m[1]).map(function(i, el) {
        var content = m[2] ? $(el).attr(m[2]) : $(el).text();
        return applyFilters(content, m.filters);
      }).toArray();
    }

    // fill a single object
    function fill(obj) {
      var parent = obj.$root ? root.find(obj.$root) : root;
      var out = {};

      keys(obj).forEach(function(k) {
        var v = obj[k];
        var found = findMany(parent, v)[0];
        if (found) out[k] = found;
      });

      return out;
    }

    // fill a collection of objects
    function fillMany(obj) {
      var parent = obj.$root ? root.find(obj.$root) : root;
      var els = parent.toArray();
      var arr = keys(obj);

      return els.map(function(el) {
        var out = {};
        arr.forEach(function(k) {
          var v = obj[k];
          var found = findMany($(el), v)[0];
          if (found) out[k] = found;
        });
        return out;
      });
    }

    function applyFilters(str, fns) {
      return fns.reduce(function(out, fn) {
        return fn(out);
      }, str);
    }

    function parse(str) {
      var fns = str.split(rfilters);
      str = fns.shift();

      fns = fns.filter(function(key) {
        return filters[key];
      }).map(function(key) {
        return filters[key];
      })

      var m = str.match(rselector);
      m.filters = fns;
      return m;
    }
  }

  return xray;
}
