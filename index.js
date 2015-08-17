/**
 * Module Dependencies
 */

var type = require('component-type');
var parser = require('x-ray-parse');
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

var rdom = /^(tagName|nodeType)$/;

/**
 * x-ray
 *
 * @param {String} html
 * @param {Object} formatters
 * @return {xray}
 * @api public
 */

function Xray(html, formatters) {
  html = html || '';
  formatters = formatters || {};

  var $ = html.html ? html : cheerio.load(html);
  var $document = $.root();
  return xray;

  function xray(obj, $scope) {
    $scope = $scope || $document;

    // switch between the types of objects
    switch(type(obj)) {
      case 'string':
        return parse(obj, formatters).attribute
          ? string_find_one.call(xray, $scope, obj, formatters)
          : $(obj, $scope)
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
 * @param {Object} filter
 * @return {String}
 */

function string_find_one($root, str, filters) {
  var select = parse(str, filters);

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
 * @param {Object} filter
 * @return {String}
 */

function object_find_one($root, obj, filter) {
  $root = obj.$root ? $root.find(obj.$root) : $root;
  var xray = this;
  var out = {};

  keys(obj).forEach(function(k) {
    var v = obj[k];

    var str = 'string' == typeof v
      ? string_find_one.call(xray, $root, v, filter)
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
 * @param {Object} filter
 * @param {Array}
 */

function string_find_many($root, str, filter) {
  var select = parse(str, filter);
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
 * @param {Object} filter
 * @return {Array}
 */

function object_find_many($root, obj, filter) {
  return obj.$root
    ? object_find_many_with_root.call(this, $root, obj, filter)
    : object_find_many_without_root.call(this, $root, obj, filter)
}

/**
 * Select an array of objects [{ $root: '...', key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} filter
 * @return {Array}
 */

function object_find_many_with_root($root, obj, filter) {
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
    out.push(object_find_one.call(xray, $el, o, filter));
  });

  return out;
}

/**
 * Select an array of objects (w/o $root) [{ key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} filter
 * @return {Array}
 */

function object_find_many_without_root($root, obj, filter) {
  var ks = keys(obj);
  var xray = this;
  var out = [];

  var arr = ks.map(function(k) {
    var v = obj[k];

    switch (type(v)) {
      case 'string': return string_find_many.call(this, $root, v, filter);
      case 'object': return object_find_many.call(this, $root, v, filter);
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
 * @param {Array} filter
 * @return {String}
 */

function format(str, filter) {
  return filter.reduce(function(out, format) {
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
  var obj = parser(str);
  obj.filters = obj.filters
    .filter(function(filter) {
      return filters[filter.name];
    })
    .map(function(filter) {
      filter.fn = filters[filter.name];
      return filter;
    });

  return obj;
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
    return format(str, select.filters);
  }
}
