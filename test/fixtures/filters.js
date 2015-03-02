module.exports = {
  href : function(str) {
    return str.replace(/^https?:\/\//, '');
  },
  https: function(str) {
    return /^https:\/\//.test(str);
  },
  uppercase: function(str) {
    return str.toUpperCase();
  },
  split: function(str, splitter) {
    return str.split(splitter);
  }
}
