module.exports = {
  href : function(str) {
    return str.replace(/^https?:\/\//, '');
  },
  uppercase: function(str) {
    return str.toUpperCase();
  }
}
