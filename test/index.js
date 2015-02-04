/**
 * Module Dependencies
 */

var cheerio = require('cheerio');
var join = require('path').join;
var assert = require('assert');
var Xray = require('..');
var fs = require('fs');

/**
 * Fixtures
 */

var google = read('google.html');
var matio = read('matio.html');

/**
 * Filters
 */

var filters = require('./fixtures/filters');

/**
 * Tests
 */

describe('x-ray-select', function() {

  describe('strings', function() {
    it('should work with strings', function() {
      var xray = Xray(matio);
      assert('http://github.com/matthewmueller' == xray('a[href]'));
    })

    it('should support when cheerio instances are passed in', function() {
      var xray = Xray(cheerio.load(matio));
      assert('http://github.com/matthewmueller' == xray('a[href]'));
    });

    it('should support filters', function() {
      var xray = Xray(matio, filters);
      assert('github.com/matthewmueller' == xray('a[href]|href'));
    });

    it('should support multiple filters', function() {
      var xray = Xray(matio, filters);
      assert('GITHUB.COM/MATTHEWMUELLER' == xray('a[href]|href|uppercase'));
    });

    it('should support filters with arguments', function() {
      var xray = Xray(matio, filters);
      assert.deepEqual(['github.com', 'matthewmueller'], xray('a[href]|href|split:/'));
    })

    it('should return undefined if nothing is false', function() {
      var xray = Xray(matio);
      assert(undefined === xray('.zzzzz'));
    })
  })


  describe('arrays', function() {
    it('should work with arrays', function() {
      var xray = Xray(matio);

      assert.deepEqual(xray(['.Header a[href]']), [
        "http://github.com/matthewmueller",
        "http://twitter.com/mattmueller",
        "http://mat.io",
        "http://lapwinglabs.com",
        "mailto:matt@lapwinglabs.com"
      ]);
    });

    it('should return an empty array when nothing is available', function() {
      var xray = Xray(matio);
      var arr = xray(['.zzzz']);
      assert.deepEqual([], arr);
    })

    it('should support filters', function() {
      var xray = Xray(matio, filters);

      assert.deepEqual(xray(['.Header a[href] | href']), [
        "github.com/matthewmueller",
        "twitter.com/mattmueller",
        "mat.io",
        "lapwinglabs.com",
        "mailto:matt@lapwinglabs.com"
      ]);
    })

    it('should work with an array of objects', function() {
      var xray = Xray(matio);
      var arr = xray([{
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]'
      }]);

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/bmcmahen/react-wysiwyg',
        thumb: 'https://avatars2.githubusercontent.com/u/1236841?v=3&s=400'
      });

      assert.deepEqual(arr.shift(), {
        link: 'http://lapwinglabs.com/',
        thumb: 'http://lapwinglabs.com/thumbnail.png'
      });

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/mentum/lambdaws',
        thumb: 'https://avatars0.githubusercontent.com/u/10017482?v=3&s=400'
      });
    });

    it('should work with arrays of objects when nothing is found', function() {
      var xray = Xray(matio);
      var arr = xray([{
        thumb: '.thumbz'
      }]);

      assert.deepEqual([], arr);
    })

    it('should support filters on objects', function() {
      var xray = Xray(matio, filters);

      var arr = xray([{
        $root: '.item',
        link: 'a[href] | href',
        thumb: 'img[src] | href | uppercase'
      }]);

      assert.deepEqual(arr.shift(), {
        link: 'github.com/bmcmahen/react-wysiwyg',
        thumb: 'AVATARS2.GITHUBUSERCONTENT.COM/U/1236841?V=3&S=400'
      });

      assert.deepEqual(arr.shift(), {
        link: 'lapwinglabs.com/',
        thumb: 'LAPWINGLABS.COM/THUMBNAIL.PNG'
      });
    })

    it('should work with an array of nested objects', function() {
      var xray = Xray(matio);

      var arr = xray([{
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        content: {
          $root: '.item-content',
          title: 'h2',
          body: 'section'
        },
        tags: ['.item-tags li']
      }]);

      assert.deepEqual(arr.shift(), {
        link: 'https://github.com/bmcmahen/react-wysiwyg',
        thumb: 'https://avatars2.githubusercontent.com/u/1236841?v=3&s=400',
        content: {
           title: 'bmcmahen/react-wysiwyg',
           body: '\n                        MatthewMueller starred bmcmahen/react-wysiwyg\n                    '
        },
        tags: [ 'github', 'development' ]
      });

      assert.deepEqual(arr.shift(), {
        "link": "http://lapwinglabs.com/",
        "thumb": "http://lapwinglabs.com/thumbnail.png",
        "content": {
          "title": "Lapwing Labs",
          "body": "\n                        New Blog Post: Principles of an Ideal Database Client.\n                        http://t.co/CRsotzXeWQ — Matthew Mueller (@MattMueller)\n                        January 25, 2015\n                    "
        },
        "tags": [
          "twitter"
        ]
      });

      assert.deepEqual(arr.shift(), {
        "link": "https://github.com/mentum/lambdaws",
        "thumb": "https://avatars0.githubusercontent.com/u/10017482?v=3&s=400",
        "content": {
          "title": "mentum/lambdaws",
          "body": "\n                        MatthewMueller starred mentum/lambdaws\n                    "
        },
        "tags": []
      });
    })
  });

  describe('objects', function() {
    it('should return an empty object when nothing is found', function() {
      var xray = Xray(matio);
      var obj = xray({
        thumb: '.thumbz'
      });
      assert.deepEqual({}, obj);
    })

    it('should work with shallow objects', function() {
      var xray = Xray(matio);

      var obj = xray({
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]'
      });

      assert.equal('https://github.com/bmcmahen/react-wysiwyg', obj.link);
      assert.equal('https://avatars2.githubusercontent.com/u/1236841?v=3&s=400', obj.thumb);
    });

    it('should work with deeply nested objects', function() {
      var xray = Xray(matio);

      var obj = xray({
        $root: '.item',
        link: 'a[href]',
        thumb: 'img[src]',
        content: {
          $root: '.item-content',
          title: 'h2',
          content: 'section'
        }
      });

      assert.deepEqual(obj, {
        link: 'https://github.com/bmcmahen/react-wysiwyg',
        thumb: 'https://avatars2.githubusercontent.com/u/1236841?v=3&s=400',
        content: {
          title: 'bmcmahen/react-wysiwyg',
          content: '\n                        MatthewMueller starred bmcmahen/react-wysiwyg\n                    '
        }
      });
    });

    it('should support single objects with an array inside', function() {
      var xray = Xray(matio);

      var obj = xray({
        $root: ".item",
        link: 'a[href]',
        thumb: 'img[src]',
        content: {
          $root: '.item-content',
          title: 'h2',
          body: 'section'
        },
        tags: ['.item-tags li']
      })

      assert.deepEqual(obj, {
        link: 'https://github.com/bmcmahen/react-wysiwyg',
        thumb: 'https://avatars2.githubusercontent.com/u/1236841?v=3&s=400',
        content: {
          title: 'bmcmahen/react-wysiwyg',
          body: '\n                        MatthewMueller starred bmcmahen/react-wysiwyg\n                    '
        },
        tags: [ 'github', 'development' ]
      });

    });
  });
});

function read(fixture) {
  return fs.readFileSync(join(__dirname, 'fixtures', fixture), 'utf8');
}
