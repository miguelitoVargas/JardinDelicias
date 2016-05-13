/* */ 
(function(Buffer) {
  var deepExtend = module.exports = function() {
    if (arguments.length < 1 || typeof arguments[0] !== 'object') {
      return false;
    }
    if (arguments.length < 2)
      return arguments[0];
    var target = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    var key,
        val,
        src,
        clone,
        tmpBuf;
    args.forEach(function(obj) {
      if (typeof obj !== 'object')
        return;
      for (key in obj) {
        src = target[key];
        val = obj[key];
        if (val === target)
          continue;
        if (typeof val !== 'object' || val === null) {
          target[key] = val;
          continue;
        } else if (val instanceof Buffer) {
          tmpBuf = new Buffer(val.length);
          val.copy(tmpBuf);
          target[key] = tmpBuf;
          continue;
        } else if (val instanceof Date) {
          target[key] = new Date(val.getTime());
          continue;
        } else if (val instanceof RegExp) {
          target[key] = new RegExp(val);
          continue;
        }
        if (typeof src !== 'object' || src === null) {
          clone = (Array.isArray(val)) ? [] : {};
          target[key] = deepExtend(clone, val);
          continue;
        }
        if (Array.isArray(val)) {
          clone = (Array.isArray(src)) ? src : [];
        } else {
          clone = (!Array.isArray(src)) ? src : {};
        }
        target[key] = deepExtend(clone, val);
      }
    });
    return target;
  };
})(require('buffer').Buffer);
