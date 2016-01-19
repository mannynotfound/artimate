var proxyquire = require('proxyquire');
var sinon = require('sinon');
var _ = require('lodash');

describe('Tumblr Actions =>', function () {
  var Tumblr, fakeCreds, fakeTumblrJS, fakeEngage;

  beforeEach( function () {
    fakeCreds = {
      'consumer_key': Math.random(),
      'consumer_secret': Math.random(),
      'token': Math.random(),
      'token_secret': Math.random()
    };

    fakeTumblrJS = {
      createClient: function (credentials) {
        return {
          credentials: credentials,
          userInfo: function (cb) {
            cb(null, {
              'user': { 'name': 'TumblrTest' }
            });
          },
          tagged: function (tag, options, cb) {
            cb(null, [{
              'blog_name': 'TagTest'
            }])
          },
          blogInfo: function (name, cb) {
            cb(null, {
              'posts': 4040
            });
          },
          like: function(post, reblog_key, cb) {
            cb(null);
          },
          follow: function (blogUrl, cb) {
            cb(null);
          }
        };
      }
    }

    fakeEngage = {
      object: {},
      write: sinon.spy()
    }

    Tumblr = proxyquire('../actions/tumblr/', {
      'tumblr.js': fakeTumblrJS
    });
  });

  it('should init with proper credentials', function () {
    var test = new Tumblr(fakeCreds, {}, function () {});
    _.isEqual(test.getClient().credentials, fakeCreds).should.be.true();
  });

  it('should callback with error', function () {
    fakeTumblrJS.createClient = function (credentials) {
      return {
        userInfo: function (cb) {
          cb(new Error());
        }
      };
    }

    Tumblr = proxyquire('../actions/tumblr/', {
      'tumblr.js': fakeTumblrJS
    });

    var test = new Tumblr(fakeCreds, {}, function (err) {
      (err instanceof Error).should.be.true();
    });
  });

  it('should return user info', function () {
    var test = new Tumblr(fakeCreds, {}, function () {});
    test.getUser().user.name.should.equal('TumblrTest');
  });

  it('should search for tagged posts', function () {
    var test = new Tumblr(fakeCreds, {}, function () {});
    test.searchForPosts('test', {}, function (err, results) {
      results[0].blog_name.should.equal('TagTest');
    });
  });

  it('should look up blog', function () {
    var test = new Tumblr(fakeCreds, {}, function () {});
    test.lookUpBlog('test', function (err, results) {
      results.posts.should.equal(4040);
    });
  });

  it('should like post and write to db', function () {
    var test = new Tumblr(fakeCreds, fakeEngage, function () {});
    test.likePost({
      'id': Math.random(),
      'reblog_key': Math.random(),
      'blog_name': 'LikeTest',
      'foundBy': 'test'
    }, function (err) {
      (err === null).should.be.true();
      fakeEngage.object.LikeTest.user.should.equal('LikeTest');
      fakeEngage.object.LikeTest.action.should.equal('like');
      fakeEngage.write.calledOnce.should.be.true();
    });
  });

  it('should follow blog and write to db', function () {
    var url;
    fakeTumblrJS = {
      createClient: function (credentials) {
        return {
          credentials: credentials,
          userInfo: function (cb) {
            cb(null, {
              'user': { 'name': 'TumblrTest' }
            });
          },
          follow: function (blogUrl, cb) {
            cb(blogUrl);
          }
        };
      }
    }

    Tumblr = proxyquire('../actions/tumblr/', {
      'tumblr.js': fakeTumblrJS
    });

    var test = new Tumblr(fakeCreds, fakeEngage, function () {});
    test.followBlog({
      'id': Math.random(),
      'reblog_key': Math.random(),
      'blog_name': 'FollowTest',
      'foundBy': 'test'
    }, function (err) {
      err.should.equal('http://FollowTest.tumblr.com');
      fakeEngage.object.FollowTest.user.should.equal('FollowTest');
      fakeEngage.object.FollowTest.action.should.equal('follow');
      fakeEngage.write.calledOnce.should.be.true();
    });
  });
});
