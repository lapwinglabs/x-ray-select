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
 * Objects
 */

describe('objects selectors', function() {
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
      }
    });

    assert.deepEqual(obj, {
      link: 'https://github.com/matthewmueller',
      thumb: 'github.png',
      className: 'item',
      content: {
        title: 'matthewmueller\'s github',
        body: 'matthewmueller\'s bio',
        className: 'item-content',
      }
    });
  });

  it('should work without a root', function() {
    var xray = Xray(m(function() {/*
      <header>
        <div class="item">
          <a href="https://github.com/matthewmueller">github</a>
          <img src="github.png" />
          <div class="item-content">
            <h2>matthewmueller's github</h2>
            <section>matthewmueller's bio</section>
          </div>
          <ul class="tags">
            <li>a</li>
            <li>b</li>
            <li>c</li>
          </ul>
        </div>
      </header>
    */}), filters);

    var obj = xray({
      link: 'a[href]',
      thumb: 'img[src]',
      tagName: '[tagName]',
      content: {
        $root: '.item-content',
        title: 'h2',
        body: 'section',
        className: '[class]'
      },
      tags: ['.tags li']
    });

    assert.deepEqual(obj, {
      link: 'https://github.com/matthewmueller',
      thumb: 'github.png',
      tagName: 'root',
      content: {
        title: 'matthewmueller\'s github',
        body: 'matthewmueller\'s bio',
        className: 'item-content',
      },
      tags: ['a', 'b', 'c']
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
