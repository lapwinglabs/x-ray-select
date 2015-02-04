/**
 * Module Dependencies
 */

var formatParser = require('format-parser');
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

  var $ = html.html ? html : cheerio.load(html);
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
        case 'string': return arr.concat(findMany(root.eq(0), v));
        case 'object': return fillMany(v);
      }
    }

    // find many elements
    function findMany($el, str) {
      if ('string' != type(str)) return [xray(str, $el)];
      var m = parse(str);
      var els =$el.find(m[1]).toArray();
      return els.map(function(el) {
        var content = m[2] ? $(el).attr(m[2]) : $(el).text();
        return applyFilters(content, m.filters);
      });
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
      }).filter(function(item) {
        return keys(item).length;
      });
    }

    function applyFilters(str, formatters) {
      return formatters.reduce(function(out, formatter) {
        return formatter.fn.apply(formatter.fn, [out].concat(formatter.args));
      }, str);
    }

    function parse(str) {
      var formatters = str.split(rfilters);
      str = formatters.shift();

      formatters = formatParser(formatters.join('|'));

      formatters = formatters.filter(function(formatter) {
        return filters[formatter.name];
      }).map(function(formatter) {
        formatter.fn = filters[formatter.name];
        return formatter;
      })

      var m = str.match(rselector);
      m.filters = formatters;
      return m;
    }
  }

  return xray;
}
