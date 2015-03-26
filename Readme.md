# x-ray select

The selection parser for x-ray. Aiming to bring structure to the web.

## Installation

```bash
npm install x-ray-select
```

## Features

- Supports collections and nested collections
- Supports filters with arguments using [format-parser](http://github.com/component/format-parser)
- Supports attribute selection

## Example

```js
var request = require('superagent');
var assert = require('assert');
var Select = require('x-ray-select');

/**
 * Structure
 */

var struct = [{
  $root: ".item",
  link: 'a@href',
  thumb: 'img@src',
  content: {
    $root: '.item-content',
    title: 'h2',
    body: 'section'
  },
  tags: ['.item-tags li']
}];

/**
 * Fetch the HTML
 */

request.get('http://mat.io', function(err, res) {
  var html = res.text;
  var select = Select(html);
  var arr = select(struct);

  // test
  var item = arr.pop();
  assert.deepEqual(item, {
    "link": "http://ift.tt/1xIsboY",
    "thumb": "http://www.google.com/s2/favicons?domain=http://ift.tt/1xIsboY",
    "content": {
      "title": "The 100 Best Children's Books of All Time",
      "body": "Relive your childhood with TIME's list of the best 100 children's books of all time http://t.co/NEvBhNM4np http://ift.tt/1sk3xdM\n\n— TIME.com (@TIME) January 11, 2015"
    },
    "tags": [
      "twitter"
    ]
  });
});
```

## Test

```
npm install
make test
```

## License

MIT
