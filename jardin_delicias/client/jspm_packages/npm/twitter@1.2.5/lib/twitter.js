/* */ 
'use strict';
var url = require('url');
var streamparser = require('./parser');
var request = require('request');
var extend = require('deep-extend');
var VERSION = require('../package.json!systemjs-json').version;
function Twitter(options) {
  if (!(this instanceof Twitter))
    return new Twitter(options);
  this.VERSION = VERSION;
  this.options = extend({
    consumer_key: null,
    consumer_secret: null,
    access_token_key: null,
    access_token_secret: null,
    rest_base: 'https://api.twitter.com/1.1',
    stream_base: 'https://stream.twitter.com/1.1',
    user_stream_base: 'https://userstream.twitter.com/1.1',
    site_stream_base: 'https://sitestream.twitter.com/1.1',
    media_base: 'https://upload.twitter.com/1.1',
    request_options: {headers: {
        'Accept': '*/*',
        'Connection': 'close',
        'User-Agent': 'node-twitter/' + VERSION
      }}
  }, options);
  this.request = request.defaults(extend(this.options.request_options, {oauth: {
      consumer_key: this.options.consumer_key,
      consumer_secret: this.options.consumer_secret,
      token: this.options.access_token_key,
      token_secret: this.options.access_token_secret
    }}));
}
Twitter.prototype.__buildEndpoint = function(path, base) {
  var bases = {
    'rest': this.options.rest_base,
    'stream': this.options.stream_base,
    'user_stream': this.options.user_stream_base,
    'site_stream': this.options.site_stream_base,
    'media': this.options.media_base
  };
  var endpoint = (bases.hasOwnProperty(base)) ? bases[base] : bases.rest;
  if (url.parse(path).protocol !== null) {
    endpoint = path;
  } else {
    if (path.match(/^(\/)?media/)) {
      endpoint = bases.media;
    }
    endpoint += (path.charAt(0) === '/') ? path : '/' + path;
  }
  endpoint = endpoint.replace(/\/$/, "");
  endpoint += (path.split('.').pop() !== 'json') ? '.json' : '';
  return endpoint;
};
Twitter.prototype.__request = function(method, path, params, callback) {
  var base = 'rest';
  var stream = false;
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  if (typeof params.base !== 'undefined') {
    base = params.base;
    delete params.base;
  }
  if (base.match(/stream/)) {
    stream = true;
  }
  var options = {
    method: method.toLowerCase(),
    url: this.__buildEndpoint(path, base)
  };
  if (method === 'get') {
    options.qs = params;
  }
  if (method === 'post') {
    var formKey = 'form';
    if (typeof params.media !== 'undefined') {
      formKey = 'formData';
    }
    options[formKey] = params;
  }
  this.request(options, function(error, response, data) {
    if (error) {
      callback(error, data, response);
    } else {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        callback(new Error('Status Code: ' + response.statusCode), data, response);
      }
      if (typeof data.errors !== 'undefined') {
        callback(data.errors, data, response);
      } else if (response.statusCode !== 200) {
        callback(new Error('Status Code: ' + response.statusCode), data, response);
      } else {
        callback(null, data, response);
      }
    }
  });
};
Twitter.prototype.get = function(url, params, callback) {
  return this.__request('get', url, params, callback);
};
Twitter.prototype.post = function(url, params, callback) {
  return this.__request('post', url, params, callback);
};
Twitter.prototype.stream = function(method, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = {};
  }
  var base = 'stream';
  if (method === 'user' || method === 'site') {
    base = method + '_' + base;
  }
  var url = this.__buildEndpoint(method, base);
  var request = this.request({
    url: url,
    qs: params
  });
  var stream = new streamparser();
  stream.destroy = function() {
    if (typeof request.abort === 'function')
      request.abort();
    else
      request.socket.destroy();
  };
  request.on('response', function(response) {
    response.on('data', function(chunk) {
      stream.receive(chunk);
    });
    response.on('error', function(error) {
      stream.emit('error', error);
    });
    response.on('end', function() {
      stream.emit('end', response);
    });
  });
  request.on('error', function(error) {
    stream.emit('error', error);
  });
  request.end();
  if (typeof callback === 'function') {
    callback(stream);
  }
};
module.exports = Twitter;
