var tumblr = require('tumblr.js');
var moment = require('moment');

/*
 * CONSTRUCTOR
 * credentials: tumblr api credentials
 * engaged: lowdb database of engaged tumblr users
 * cb: callback when Tumblr has fetched client blog info
 */

function Tumblr (credentials, engaged, cb) {
  var self = this;
  this.client = tumblr.createClient(credentials);
  this.engaged = engaged;
  this.client.userInfo(function(err, resp) {
    if (err) cb(err);
    else {
      self.userInfo = resp;
      cb(null);
    }
  });
}

/*
 * ACTIONS
 */

Tumblr.prototype = {
  getClient: function () {
    return this.client;
  },

  getUser: function () {
    return this.userInfo;
  },

  searchForPosts: function (tag, options, cb) {
    this.client.tagged(tag, {}, cb);
  },

  likePost: function (post, cb) {
    var self = this;
    this.client.like(post.id, post.reblog_key, function (err) {
      var logInfo = {
        'action': 'like',
        'engaged_at': moment(),
        'client': self.getUser().user.name,
        'user': post.blog_name,
        'post': post.id,
        'success': err === null,
        'foundBy': post.foundBy
      };

      self.engaged.object[post.blog_name] = logInfo;
      self.engaged.write();
      cb(err);
    });
  },

  followBlog: function (post, cb) {
    var blogURL = 'http://' + post.blog_name + '.tumblr.com';
    var self = this;

    this.client.follow(blogURL, function (err) {
      var logInfo = {
        'action': 'follow',
        'engaged_at': moment(),
        'client': self.getUser().user.name,
        'user': post.blog_name,
        'success': err === null,
        'foundBy': post.foundBy
      };

      self.engaged.object[post.blog_name] = logInfo;
      self.engaged.write();
      cb(err);
    });
  },

  lookUpBlog: function (blogName, cb) {
    this.client.blogInfo(blogName, cb);
  }
};

module.exports = Tumblr;

