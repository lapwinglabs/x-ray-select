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

function Xray(html, options) {
  options = options || {};
  options = {
    rselector: options.rselector || rselector,
    rfilters: options.rfilters || rfilters,
    filters: options.filters || {},
    selectorHandler: options.selectorHandler || false,
    objectHandler: options.objectHandler || false,
  };
  html = html || '';

  var $ = html.html ? html : cheerio.load(html);
  var $document = $.root();
  return xray;

  function xray(obj, $scope) {
    $scope = $scope || $document;

    // switch between the types of objects
    switch(type(obj)) {
      case 'string': return string_find_one.call(xray, $scope, obj, options);
      case 'object': return object_find_one.call(xray, $scope, obj, options);
      case 'array':
        switch (type(obj[0])) {
          case 'string': return string_find_many.call(xray, $scope, obj[0], options);
          case 'object': return object_find_many.call(xray, $scope, obj[0], options);
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
 * @param {Object} options
 * @return {String}
 */

function string_find_one($root, str, options) {
  var select = parse(str, options);
  if (options.selectorHandler) {
    select = options.selectorHandler($root, select, options, this);
    if(select.content) return format(select.content, select.formatters);
  }
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
 * @param {Object} options
 * @return {String}
 */

function object_find_one($root, obj, options) {
  $root = obj.$root ? $root.find(obj.$root) : $root;
  var xray = this;
  var out = {};

  if (options.objectHandler) {
    var res = options.objectHandler($root, obj, options, xray);
    if (res.content) return res.content;
    obj = res.obj;
  }
  keys(obj).forEach(function(k) {
    var v = obj[k];

    var str = 'string' == typeof v
      ? string_find_one.call(xray, $root, v, options)
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
 * @param {Object} options
 * @param {Array}
 */

function string_find_many($root, str, options) {
  var select = parse(str, options);
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
 * @param {Object} options
 * @return {Array}
 */

function object_find_many($root, obj, options) {
  return obj.$root
    ? object_find_many_with_root.call(this, $root, obj, options)
    : object_find_many_without_root.call(this, $root, obj, options)
}

/**
 * Select an array of objects [{ $root: '...', key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} options
 * @return {Array}
 */

function object_find_many_with_root($root, obj, options) {
  var $els = $root.find(obj.$root);
  if (!$els.length) return [];
  var ks = keys(obj);
  var xray = this;
  var out = [];

  // reject any special characters
  var o = omit(obj, function(v, k) {
    return k == '$root';
  });

  $els.each(function(i) {
    var $el = $els.eq(i);
    out.push(object_find_one.call(xray, $el, o, options));
  });
  return out.filter(function(x){
    return type(x) == 'object' ? keys(x).length > 0 : true;
  });
}

/**
 * Select an array of objects (w/o $root) [{ key: 'selector' }]
 *
 * @param {Cheerio Element} $root
 * @param {String} obj
 * @param {Object} options
 * @return {Array}
 */

function object_find_many_without_root($root, obj, options) {
  var ks = keys(obj);
  var xray = this;
  var out = [];

  var arr = ks.map(function(k) {
    var v = obj[k];

    switch (type(v)) {
      case 'string': return string_find_many.call(this, $root, v, options);
      case 'object': return object_find_many.call(this, $root, v, options);
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

function parse(str, options) {
  var formatters = str.split(options.rfilters);
  var fselector = formatters.shift();

  formatters = formatParser(formatters.join('|'));

  formatters = formatters.filter(function(formatter) {
    return options.filters[formatter.name];
  }).map(function(formatter) {
    formatter.fn = options.filters[formatter.name];
    return formatter;
  })

  var m = fselector.match(options.rselector) || [];

  return {
    selector: m[1],
    attribute: m[2],
    formatters: formatters,
    fselector: fselector,
    input: str
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
