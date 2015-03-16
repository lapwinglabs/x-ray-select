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
 * Arrays
 */

describe('arrays selectors', function() {
  it('should select an array of strings', function() {
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

  it('should select an array of objects without a root', function() {
    var xray = Xray(m(function() {/*
      <a href="http://github.com/matthewmueller">github</a>
      <a href="http://twitter.com/mattmueller">twitter</a>
    */}))

    var arr = xray([{
      text: 'a',
      href: 'a[href]'
    }]);

    assert.deepEqual(arr, [
      {
        text: 'github',
        href: 'http://github.com/matthewmueller'
      },
      {
        text: 'twitter',
        href: 'http://twitter.com/mattmueller'
      }
    ]);
  })

  it('should group elements when there is no root', function() {
    var xray = Xray(m(function() {/*
      <h2>Github</h2>
      <a href="http://github.com/matthewmueller">github</a>
      <h2>Twitter</h2>
      <a href="http://twitter.com/mattmueller">twitter</a>
    */}))

    var arr = xray([{
      title: 'h2',
      text: 'a',
      href: 'a[href]'
    }]);

    assert.deepEqual(arr, [
      {
        title: 'Github',
        text: 'github',
        href: 'http://github.com/matthewmueller'
      },
      {
        title: 'Twitter',
        text: 'twitter',
        href: 'http://twitter.com/mattmueller'
      }
    ]);

  })

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

  it('should work on a nested object without a root', function() {
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
      link: 'a[href]',
      thumb: 'img[src]',
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
      content: {
        title: 'matthewmueller\'s github',
        body: 'matthewmueller\'s bio',
        className: 'item-content',
      }
    });

    assert.deepEqual(arr.shift(), {
      link: 'https://twitter.com/mattmueller',
      thumb: 'twitter.png',
      content: {
        title: 'mattmueller\'s twitter',
        body: 'mattmueller\'s bio',
        className: 'item-content'
      }
    });
  })
});
