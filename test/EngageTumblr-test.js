process.env.NODE_ENV = 'test';
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var _ = require('lodash');

describe('EngageTumblr =>', function () {
  var EngageTumblr, fakeTumblr, fakeConfig, fakeLow, engagement, fakeFs, clock;

  beforeEach( function () {
    this.timeout(1000);
    fakeConfig = {
      'max_likes': 1000,
      'max_follows': 200,
      'tags': [
        'testing',
        'mocha',
        'istanbul'
      ],
      'tumblr_api': {
        'consumer_key': 'lmao',
        'consumer_secret': 'crap',
        'token': 'fam',
        'token_secret': 'test'
      }
    };

    fakeTumblr = function (client, engaged, cb) {
      var self = this;
      this.client = client;
      this.engaged = engaged;
      this.userInfo = {};
      cb(null);
    }

    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-18T03:14:07.881Z",
          "sessionLikes": 13,
          "sessionFollows": 7,
          "posts": [{
            'blog_name': 'testBlog'
          }, {
            'blog_name': 'testBlog'
          }, {
            'blog_name': 'otherBlog'
          }, {
            'blog_name': 'oldBlog'
          }]
        },
        write: sinon.spy()
      }
    }

    fakeFs = {
      lstatSync: function (filepath) {
        return true;
      }
    };

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      },
      lookUpBlog: function (name, cb) {
        cb(null, {
          blog: { posts: 4999 }
        });
      }
    }

  });

  it('should init with proper credentials', function () {
    EngageTumblr.prototype.init = sinon.spy();
    engagement = new EngageTumblr(fakeConfig).should.be.ok;
    EngageTumblr.prototype.init.calledOnce.should.be.true();
  });

  it('should not init with bad credentials', function () {
    fakeTumblr = function (client,engaged, cb) {
      cb(new Error());
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      '../actions/tumblr': fakeTumblr,
      'lowdb/file-sync': fakeLow
    });

    EngageTumblr.prototype.handleError = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.handleError.calledOnce.should.be.true();
  });

  it('should init session with queue log', function () {
    EngageTumblr.prototype.engageQ = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.engageQ.calledOnce.should.be.true();
  });

  it('reset session if over 24 hours', function () {
    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "sessionLikes": 13,
          "sessionFollows": 7,
          "posts": []
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.engageQ = sinon.spy();
    EngageTumblr.prototype.q = fakeLow();
    engagement = new EngageTumblr(fakeConfig);
    setTimeout(function() {
      EngageTumblr.prototype.q.object.sessionLikes.should.equal(0);
      EngageTumblr.prototype.q.write.calledOnce.should.be.true();
    }, 0);
  });

  it('should create new log if one doesnt exist', function () {
    fakeFs = {
      lstatSync: function (filepath) {
        throw "no such file"
      }
    };

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.engageQ = sinon.spy();

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.engageQ.calledOnce.should.be.true();
  });

  it('should engage queue if posts are not empty', function () {
    EngageTumblr.prototype.engageNextInQ = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.engageNextInQ.calledOnce.should.be.true();
  });

  it('should search for more if no posts', function () {
    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "posts": []
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.searchRandomTag = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.searchRandomTag.calledOnce.should.be.true();
  });

  it('should handle error if search fails', function () {
    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "posts": []
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.searchRandomTag = function (cb) {
      cb(new Error());
    }

    EngageTumblr.prototype.handleError = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.handleError.calledOnce.should.be.true();
  });

  it('should filter posts after search', function () {
    var ogFakeLow = fakeLow;

    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "posts": [],
          'oldBlog': {
            'action': 'like'
          }
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.searchRandomTag = function (cb) {
      cb(false, ogFakeLow().object.posts);
    }

    EngageTumblr.prototype.engageNextInQ = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.engageNextInQ.calledOnce.should.be.true();
  });

  it('should search again if no new posts', function () {
    var ogFakeLow = fakeLow;

    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "posts": [],
          'oldBlog': {
            'action': 'like'
          }
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.searchRandomTag = function (cb) {
      cb(false, ogFakeLow().object.posts);
    }

    EngageTumblr.prototype.filterCount = 0;

    EngageTumblr.prototype.filterPosts = function (posts, cb) {
      if (this.filterCount < 2) {
        this.filterCount++;
        cb([]);
      } else cb([{'blog_name': 'test'}]);
    }

    EngageTumblr.prototype.engageNextInQ = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
  });

  it('should handle engage error', function () {
    fakeLow = function (filepath, storage) {
      return {
        object: {
          "sessionStart": "2016-01-17T03:14:07.881Z",
          "posts": [null],
          'oldBlog': {
            'action': 'like'
          }
        },
        write: sinon.spy()
      }
    }

    EngageTumblr = proxyquire('../engagers/EngageTumblr', {
      'lowdb': fakeLow,
      'fs': fakeFs,
      'lowdb/file-sync': fakeLow,
      '../actions/tumblr': fakeTumblr
    });

    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      }
    }

    EngageTumblr.prototype.handleError = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    EngageTumblr.prototype.handleError.calledOnce.should.be.true();
  });

  it('should engage next in queue correctly', function () {
    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('like');
    }
    engagement = new EngageTumblr(fakeConfig);

    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('sleep');
    }

    EngageTumblr.prototype.sleep = sinon.spy();
    engagement = new EngageTumblr(fakeConfig);
    setTimeout(function () {
      EngageTumblr.prototype.sleep.calledOnce.should.be.true();
    });
  });

  it('should add default time references', function () {
    EngageTumblr.prototype.secondsPerLike = 123;
    EngageTumblr.prototype.timeOffset = 54;
    engagement = new EngageTumblr(fakeConfig);
  });

  it('should handle like correctly', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('like');
      clock.tick(99);
    }
    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      },
      lookUpBlog: function (name, cb) {
        cb(null, {
          blog: { posts: 4999 }
        });
      },
      likePost: function (post, cb) {
        cb(null);
      }
    }

    engagement = new EngageTumblr(fakeConfig);
  });

  it('should handle like error', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('like');
      clock.tick(99);
    }
    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      },
      lookUpBlog: function (name, cb) {
        cb(null, {
          blog: { posts: 4999 }
        });
      },
      likePost: function (post, cb) {
        cb(new Error('404'));
      }
    }

    engagement = new EngageTumblr(fakeConfig);
  });

  it('should handle follow correctly', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('follow');
      clock.tick(99);
    }
    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      },
      lookUpBlog: function (name, cb) {
        cb(null, {
          blog: { posts: 4999 }
        });
      },
      followBlog: function (post, cb) {
        cb(null);
      }
    }

    engagement = new EngageTumblr(fakeConfig);
  });

  it('should handle follow error', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.analyzePost = function(post, cb) {
      cb('follow');
      clock.tick(99);
    }
    EngageTumblr.prototype.Tumblr = {
      getUser: function() {
        return {
          'user': { 'name': 'GetUserTest' }
        };
      },
      lookUpBlog: function (name, cb) {
        cb(null, {
          blog: { posts: 4999 }
        });
      },
      followBlog: function (post, cb) {
        cb(new Error('Rate limit'));
      }
    }

    engagement = new EngageTumblr(fakeConfig);
  });

  it('should analyzePost correctly', function () {
    var testPost = {
      'blog_name': 'TestBlog'
    };

    EngageTumblr.prototype.q = {
      object: {
        max_likes: 1001,
        max_follows: 201,
        sessionLikes: 4040,
        sessionFollows: 72
      }
    }

    EngageTumblr.prototype.Tumblr = {
      lookUpBlog: function (post, cb) {
        cb(null, { blog: { posts: 499 } });
      }
    }

    EngageTumblr.prototype.analyzePost(testPost, function (results) {
      results.should.equal('follow');
    });

    EngageTumblr.prototype.q = {
      object: {
        max_likes: 1001,
        max_follows: 201,
        sessionLikes: 4040,
        sessionFollows: 202
      }
    }

    EngageTumblr.prototype.analyzePost(testPost, function (results) {
      results.should.equal('sleep');
    });

    EngageTumblr.prototype.q = {
      object: {
        max_likes: 1000,
        max_follows: 200,
        sessionLikes: 404,
        sessionFollows: 72
      }
    }

    EngageTumblr.prototype.Tumblr = {
      lookUpBlog: function (post, cb) {
        cb(new Error());
      }
    }

    EngageTumblr.prototype.handleError = sinon.spy();
    EngageTumblr.prototype.analyzePost(testPost, function (results) {})
    EngageTumblr.prototype.handleError.calledOnce.should.be.true();

    EngageTumblr.prototype.Tumblr = {
      lookUpBlog: function (post, cb) {
        cb(null, { blog: { posts: 5001 } });
      }
    }

    EngageTumblr.prototype.analyzePost(testPost, function (results) {
       results.should.equal('follow');
    });

  });

  it('should search random tag correctly', function () {
    EngageTumblr.prototype.client = {
      tags: [
        'test',
        'mocha',
        'lmao'
      ]
    }

    EngageTumblr.prototype.q = function (key) {
      return {
        push: sinon.spy()
      };
    }

    EngageTumblr.prototype.q.object = {
      usedTags: []
    };

    EngageTumblr.prototype.q.write = sinon.spy();

    EngageTumblr.prototype.Tumblr = {
      searchForPosts: function (tag, options, cb) {
        cb(null, [{
          'blog_name': 'test'
        }]);
      }
    }

    EngageTumblr.prototype.searchRandomTag(function (err, results) {
      results[0].blog_name.should.equal('test');
      results[0].foundBy.should.be.ok;
    });

    EngageTumblr.prototype.q.object = {
      usedTags: null
    };

    EngageTumblr.prototype.client.tags = [];

    EngageTumblr.prototype.searchRandomTag(function (err, results) {
      results[0].blog_name.should.equal('test');
    })

    EngageTumblr.prototype.Tumblr.searchForPosts = function (tag, options, cb) {
      cb(new Error());
    }

    EngageTumblr.prototype.searchRandomTag(function (err, results) {
      (err instanceof Error).should.be.true();
    });
  });

  it('should handle sleep', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.q = {
      object: {
        sessionStart: "2016-01-18T03:14:07.881Z"
      }
    }

    EngageTumblr.prototype.init = sinon.spy();
    EngageTumblr.prototype.sleep();
    clock.tick((1453173247.881 * 1000) + 1000)
    EngageTumblr.prototype.init.calledOnce.should.be.true();
  });

  it('should determine next', function () {
    clock = sinon.useFakeTimers();

    EngageTumblr.prototype.client = {
      max_likes: 1001,
      max_follows: 200
    }
    EngageTumblr.prototype.q = {
      object: {
        sessionStart: "2016-01-18T03:14:07.881Z",
        sessionLikes: 404
      }
    }

    EngageTumblr.prototype.secondsPerLike = 72;
    EngageTumblr.prototype.timeOffset = 36;

    EngageTumblr.prototype.init = sinon.spy();
    EngageTumblr.prototype.determineNext();
    clock.tick((2438174 * 1000) + 1000)
    EngageTumblr.prototype.init.calledOnce.should.be.true();
  });

});

