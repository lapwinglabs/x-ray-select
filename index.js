/**
 * Module Dependencies
 */

var formatParser = require('format-parser');
var type = require('component-type');
var omit = require('lodash.omit');
var cheerio = require('cheerio');
var zip = require('lodash.zip');
var isArray = Array.isArray;
var keys = Object.keys;

/**
 * x-ray
 */

module.exports = Xray;

/**
 * Regexps
 */

var rselector = /([^\[]+)?(?:\[([^\[]+)\])?/;
var rdom = /^(tagName|nodeType)$/;
var rfilters = /\s*\|\s*/;

/**
 * x-ray
 *
 * @param {String} html
 * @param {Object} formatters
 * @return {xray}
 * @api public
 */

function Xray(html, formatters) {
  formatters = formatters || {};
  html = html || '';

  var $ = html.html ? html : cheerio.load(html);
  var $document = $.root();
  return xray;

  function xray(obj, $scope) {
    $scope = $scope || $document;

    // switch between the types of objects
    switch(type(obj)) {
      case 'string': return string_find_one.call(xray, $scope, obj, formatters);
      case 'object': return object_find_one.call(xray, $scope, obj, formatters);
      case 'array':
        switch (type(obj[0])) {
          case 'string': return string_find_many.call(xray, $scope, obj[0], formatters);
          case 'object': return object_find_many.call(xray, $scope, obj[0], formatters);
          default: return [];
        }
    }
  }
}

/**
 * Single 'selector'
 *
 * @param {Cheerio Element} $root
 * @param {String} str
 * @param {Object} formatters
 * @return {String}
 */

function string_find_one($root, str, formatters) {
  var select = parse(str, formatters);
  var $el = select.selector
    ? $root.find(select.selector).eq(0)
    : $root.eq(0);

  return $el.length ? render($el, select) : undefined;
}

/**
 * Single Object { key: 'selector' }
 *
 * @param {Cheerio Element} $root
 * @param {Object} obj
 * @param {Object} formatters
 * @return {String}
 */

function object_find_one($root, obj, formatters) {
  $root = obj.$root ? $root.find(obj.$root) : $root;
  var xray = this;
  var out = {};

  keys(obj).forEach(function(k) {
    var v = obj[k];

    var str = 'string' == typeof v
      ? string_find_one.call(xray, $root, v, formatters)
      : xray(v, $root);

    if (str !== undefined) out[k] = str;
  });

  return out;
}

/**
 * Select an array of strings ['selector']
 *
 * @param {Cheerio Element} $root
 * @param {String} str
 * @param {Object} formatters
 * @param {Array}
 */

function string_find_many($root, str, formatters) {
  var select = parse(str, formatters);
  var $els = select.selector ? $root.find(select.selector) : $root;
  var out = [];

  $els.each(function(i) {
    var $el = $els.eq(i);
    $el.length && out.push(render($el, select));
  });

  return out;
}

/**
 * Select an array of objects
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} formatters
 * @return {Array}
 */

function object_find_many($root, obj, formatters) {
  return obj.$root
    ? object_find_many_with_root.call(this, $root, obj, formatters)
    : object_find_many_without_root.call(this, $root, obj, formatters)
}

/**
 * Select an array of objects [{ $root: '...', key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} formatters
 * @return {Array}
 */

function object_find_many_with_root($root, obj, formatters) {
  var $els = $root.find(obj.$root);
  if (!$els.length) return [];
  var ks = keys(obj);
  var xray = this;
  var out = [];

  // reject any special characters
  var o = omit(obj, function(v, k) {
    return k[0] == '$';
  });

  $els.each(function(i) {
    var $el = $els.eq(i);
    out.push(object_find_one.call(xray, $el, o, formatters));
  });

  return out;
}

/**
 * Select an array of objects (w/o $root) [{ key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} formatters
 * @return {Array}
 */

function object_find_many_without_root($root, obj, formatters) {
  var ks = keys(obj);
  var xray = this;
  var out = [];

  var arr = ks.map(function(k) {
    var v = obj[k];

    switch (type(v)) {
      case 'string': return string_find_many.call(this, $root, v, formatters);
      case 'object': return object_find_many.call(this, $root, v, formatters);
      default: return [];
    }
  });

  // TODO: is there a more optimized way to group these elements?
  arr = zip.apply(zip, arr);

  return arr.map(function(values) {
    var o = {};
    values.forEach(function(value, i) {
      if (value !== undefined) o[ks[i]] = value;
    });
    return o;
  });
}

/**
 * Format
 *
 * @param {String} str
 * @param {Array} formatters
 * @return {String}
 */

function format(str, formatters) {
  return formatters.reduce(function(out, format) {
    return format.fn.apply(format.fn, [out].concat(format.args));
  }, str);
}

/**
 * Format parser
 *
 * @param {String}
 * @param {Object} filters
 * @return {Object}
 */

function parse(str, filters) {
  var formatters = str.split(rfilters);
  str = formatters.shift();

  formatters = formatParser(formatters.join('|'));

  formatters = formatters.filter(function(formatter) {
    return filters[formatter.name];
  }).map(function(formatter) {
    formatter.fn = filters[formatter.name];
    return formatter;
  })

  var m = str.match(rselector) || [];

  return {
    selector: m[1],
    attribute: m[2],
    formatters: formatters
  };
}

/**
 * render
 *
 * @param {Cheerio Element} $el
 * @param {Object} select
 */

function render($el, select) {
  switch (select.attribute) {
    case 'html': return fmt($el.html());
    case undefined: return fmt($el.text());
    default:
      return rdom.test(select.attribute)
        ? fmt($el[0][select.attribute])
        : fmt($el.attr(select.attribute));
  }

  function fmt(str) {
    return format(str, select.formatters);
  }
}
