/**
 * Module Dependencies
 */

var m = require('multiline').stripIndent;
var cheerio = require('cheerio');
var join = require('path').join;
var assert = require('assert');
var Xray = require('..');
var fs = require('fs');

/**
 * Filters
 */

var filters = require('./fixtures/filters');

/**
 * Tests
 */

describe('x-ray-select', function() {

  /**
   * Strings
   */

  describe('strings', function() {
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


  /**
   * Arrays
   */

  describe('arrays', function() {
    it('should work with arrays', function() {
      var xray = Xray(m(function() {/*
        <header>
        <a href="http://github.com/matthewmueller">github</a>
        <a href="http://twitter.com/mattmueller">twitter</a>
        <a href="http://mat.io">mat.io</a>
        <a href="http://lapwinglabs.com">lapwing labs</a>
        <a href="mailto:matt@lapwinglabs.com">
        </header>
      */}))

      assert.deepEqual(xray(['header a[href]']), [
        "http://github.com/matthewmueller",
        "http://twitter.com/mattmueller",
        "http://mat.io",
        "http://lapwinglabs.com",
        "mailto:matt@lapwinglabs.com"
      ]);
    });

    it('should return an empty array when nothing is available', function() {
      var xray = Xray(m(function() {/*
        <header>
          <a href="http://github.com/matthewmueller">github</a>
          <a href="http://twitter.com/mattmueller">twitter</a>
          <a href="http://mat.io">mat.io</a>
          <a href="http://lapwinglabs.com">lapwing labs</a>
          <a href="mailto:matt@lapwinglabs.com">
        </header>
      */}))

      var arr = xray(['.zzzz']);
      assert.deepEqual([], arr);
    })


    it('should work with arrays of objects when nothing is found', function() {
      var xray = Xray(m(function() {/*
        <header>
          <a href="http://github.com/matthewmueller">github</a>
          <a href="http://twitter.com/mattmueller">twitter</a>
          <a href="http://mat.io">mat.io</a>
          <a href="http://lapwinglabs.com">lapwing labs</a>
          <a href="mailto:matt@lapwinglabs.com">
        </header>
      */}))

      var arr = xray([{
        thumb: '.thumbz'
      }]);

      assert.deepEqual([], arr);
    })

    it('should support filters', function() {
      var xray = Xray(m(function() {/*
        <header>
          <a href="http://github.com/matthewmueller">github</a>
          <a href="http://twitter.com/mattmueller">twitter</a>
          <a href="http://mat.io">mat.io</a>
          <a href="http://lapwinglabs.com">lapwing labs</a>
          <a href="mailto:matt@lapwinglabs.com">
        </header>
      */}), filters);

      assert.deepEqual(xray(['header a[href] | href']), [
        "github.com/matthewmueller",
        "twitter.com/mattmueller",
        "mat.io",
        "lapwinglabs.com",
        "mailto:matt@lapwinglabs.com"
      ]);
    })

    it('should support falsy values from filters for collections', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
          </div>
          <div class="item">
            <a href="http://mat.io">mat.io</a>
          </div>
        </header>
      */}), filters);

      var arr = xray([{
        $root: '.item',
        link: 'a[href]',
        https: 'a[href] | secure',
      }]);

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/matthewmueller',
        https: true
      });

      assert.deepEqual(arr.shift(), {
        link: 'https://twitter.com/mattmueller',
        https: true
      });

      assert.deepEqual(arr.shift(), {
        link: 'http://mat.io',
        https: false
      });
    })

    it('should work with an array of objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
            <img src="github.png" />
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
            <img src="twitter.png" />
          </div>
          <div class="item">
            <a href="http://mat.io">mat.io</a>
            <img src="matt.png" />
          </div>
        </header>
      */}), filters);

      var arr = xray([{
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        className: '[class]'
      }]);

      assert(3 == arr.length);

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/matthewmueller',
        thumb: 'github.png',
        className: 'item'
      });

      assert.deepEqual(arr.shift(), {
        link: 'https://twitter.com/mattmueller',
        thumb: 'twitter.png',
        className: 'item'
      });

      assert.deepEqual(arr.shift(), {
        link: 'http://mat.io',
        thumb: 'matt.png',
        className: 'item'
      });
    });

    it('should support filters on objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
            <img src="github.png" />
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
            <img src="twitter.png" />
          </div>
        </header>
      */}), filters);

      var arr = xray([{
        $root: '.item',
        link: 'a[href] | href',
        thumb: 'img[src] | href | uppercase',
        className: '[class] | uppercase'
      }]);

      assert(2 == arr.length);

      assert.deepEqual(arr.shift(), {
        link: 'github.com/matthewmueller',
        thumb: 'GITHUB.PNG',
        className: 'ITEM'
      });

      assert.deepEqual(arr.shift(), {
        link: 'twitter.com/mattmueller',
        thumb: 'TWITTER.PNG',
        className: 'ITEM'
      });
    })

    it('should work with an array of nested objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
            <img src="github.png" />
            <div class="item-content">
              <h2>matthewmueller's github</h2>
              <section>matthewmueller's bio</section>
            </div>
            <ul class="item-tags">
              <li>a</li>
              <li>b</li>
              <li>c</li>
            </ul>
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
            <img src="twitter.png" />
            <div class="item-content">
              <h2>mattmueller's twitter</h2>
              <section>mattmueller's bio</section>
            </div>
            <ul class="item-tags">
              <li>1</li>
              <li>2</li>
              <li>3</li>
            </ul>
          </div>
        </header>
      */}), filters);

      var arr = xray([{
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        className: '[class]',
        content: {
          $root: '.item-content',
          title: 'h2',
          body: 'section',
          className: '[class]'
        },
        tags: ['.item-tags li']
      }]);

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/matthewmueller',
        thumb: 'github.png',
        className: 'item',
        content: {
          title: 'matthewmueller\'s github',
          body: 'matthewmueller\'s bio',
          className: 'item-content',
        },
        tags: [ 'a', 'b', 'c' ]
      });

      assert.deepEqual(arr.shift(), {
        link: 'https://twitter.com/mattmueller',
        thumb: 'twitter.png',
        className: 'item',
        content: {
          title: 'mattmueller\'s twitter',
          body: 'mattmueller\'s bio',
          className: 'item-content'
        },
        tags: [ '1', '2', '3' ]
      });
    })
  });

  /**
   * Objects
   */

  describe('objects', function() {
    it('should return an empty object when nothing is found', function() {
      var xray = Xray('<a href="mat.io"></a>');
      var obj = xray({
        thumb: '.thumbz'
      });
      assert.deepEqual({}, obj);
    })

    it('should work with shallow objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
            <img src="github.png" />
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
            <img src="twitter.png" />
          </div>
        </header>
      */}));

      var obj = xray({
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        className: '[class]'
      });

      assert.equal('https://github.com/matthewmueller', obj.link);
      assert.equal('github.png', obj.thumb);
      assert.equal('item', obj.className);
    });

    it('should work with deeply nested objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
            <img src="github.png" />
            <div class="item-content">
              <h2>matthewmueller's github</h2>
              <section>matthewmueller's bio</section>
            </div>
            <ul class="item-tags">
              <li>a</li>
              <li>b</li>
              <li>c</li>
            </ul>
          </div>
          <div class="item">
            <a href="https://twitter.com/mattmueller">twitter</a>
            <img src="twitter.png" />
            <div class="item-content">
              <h2>mattmueller's twitter</h2>
              <section>mattmueller's bio</section>
            </div>
            <ul class="item-tags">
              <li>1</li>
              <li>2</li>
              <li>3</li>
            </ul>
          </div>
        </header>
      */}), filters);

      var obj = xray({
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        className: '[class]',
        content: {
          $root: '.item-content',
          title: 'h2',
          body: 'section',
          className: '[class]'
        },
        tags: ['.item-tags li']
      });

      assert.deepEqual(obj, {
        link: 'https://github.com/matthewmueller',
        thumb: 'github.png',
        className: 'item',
        content: {
          title: 'matthewmueller\'s github',
          body: 'matthewmueller\'s bio',
          className: 'item-content',
        },
        tags: [ 'a', 'b', 'c' ]
      });
    });

    it('should support falsy values from filters for single objects', function() {
      var xray = Xray(m(function() {/*
        <header>
          <div class="item">
            <a href="https://github.com/matthewmueller">github</a>
          </div>
        </header>
      */}), filters);

      var obj = xray({
        $root: '.item',
        link: 'a[href]',
        http: 'a[href] | insecure',
      });

      assert.deepEqual(obj, {
        link: 'https://github.com/matthewmueller',
        http: false
      });
    });
  });
});

/**
 * Read a file
 *
 * @param {String} fixture
 * @return {String}
 */

function read(fixture) {
  return fs.readFileSync(join(__dirname, 'fixtures', fixture), 'utf8');
}
