module.exports = {
  href : function(str) {
    return str.replace(/^https?:\/\//, '');
  },
  secure: function(str) {
    return /^https:\/\//.test(str);
  },
  insecure: function(str) {
    return /^http:\/\//.test(str);
  },
  uppercase: function(str) {
    return str.toUpperCase();
  },
  split: function(str, splitter) {
    return str.split(splitter);
  }
}
