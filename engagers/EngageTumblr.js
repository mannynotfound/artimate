var fs = require('fs');
var colors = require('colors');
var Tumblr = require('../actions/tumblr');
var _ = require('lodash');
var moment = require('moment');
var low = require('lowdb');
var storage = require('lowdb/file-sync');

function EngageTumblr (client) {
  this.client = client;
  this.engaged = low('logs/tumblr/engaged.json', {storage});
  var self = this;
  this.Tumblr = new Tumblr(client.tumblr_api, this.engaged, function(err) {
    if (err) self.handleError(err);
    else {
      self.init();
    }
  });
}

EngageTumblr.prototype = {
  /*
   * Check if we have an existing queue log, which holds session
   * info like the queue, used tags, and session start time
   */
  init: function () {
    var username =  this.Tumblr.getUser().user.name;
    var filepath = 'logs/tumblr/qs/' + username + '.json';

    try {
      var stats = fs.lstatSync(filepath);
      this.q = low(filepath, {storage});
      // check if its been 24 hours since session start, in which
      // case start a new session and restart variables
      var seshStart = moment(this.q.object.sessionStart);
      var duration = moment.duration(moment().diff(seshStart)).asHours();
      if (duration >= 24) {
        this.q.object.sessionStart = moment();
        this.q.object.sessionLikes = 0;
        this.q.object.sessionFollows = 0;
        this.q.write();
      }

      this.engageQ();
    }
    catch (e) {
      // istanbul ignore next
      if (process.env.NODE_ENV !== 'test') console.log('NO QUEUE FILE FOUND!'.red + ' creating one...'.green);

      this.q = low(filepath, {storage});
      this.q.object.sessionStart = moment();
      this.q.object.sessionLikes = 0;
      this.q.object.sessionFollows = 0;
      this.q.write();

      this.engageQ();
    }
  },

  /*
   * Check if we have any posts in the queue, if not
   * use a discovery method to find more posts
   * TODO: add more discovery methods besides tags
   */
  engageQ () {
    if (_.isEmpty(this.q.object.posts)) {
      var self = this;
      // istanbul ignore next
      if (process.env.NODE_ENV !== 'test') console.log('QUEUE EMPTY'.red + ' FETCHING MORE POSTS ... '.green);
      this.searchRandomTag(function (err, resp) {
        if (err) self.handleError(err);
        else {
          // istanbul ignore next
          if (process.env.NODE_ENV !== 'test') console.log('FOUND '.green + resp.length.toString().magenta + ', FILTERING....'.green)
          self.filterPosts(resp, function (filteredPosts) {
            if (!_.isEmpty(filteredPosts)) {
              // istanbul ignore next
              if (process.env.NODE_ENV !== 'test') console.log('FILTERED '.green + (resp.length - filteredPosts.length).toString().magenta + ' POSTS, ADDING '.green + filteredPosts.length.toString().magenta + ' POSTS TO QUEUE'.green);
              self.q.object.posts = filteredPosts;
              self.q.write();
              self.engageNextInQ();
            } else {
              // istanbul ignore next
              if (process.env.NODE_ENV !== 'test') console.log('FOUND NO NEW POSTS :('.red + ' TRYING DIFFERENT TAG ...'.green);
              self.engageQ();
            }
          });
        }
      });
    } else this.engageNextInQ();
  },

  /*
   * Filters out posts we've already engaged with
   * and de-dupes posts by unique user
   */
  filterPosts (posts, cb) {
    var filteredPosts = [];
    var engaged = _.keys(this.engaged.object);

    // only include a given blog once
    posts = _.uniqBy(posts, 'blog_name');

    // check if we've engaged blogs already
    posts.forEach(function (p) {
      var isOk = true;
      if (engaged.indexOf(p.blog_name) > -1) isOk = false;
      if (isOk) filteredPosts.push(p);
    });

    cb(filteredPosts);
  },

  /*
   * Run analysis on next post and act upon analysis
   * Also add a random offset to vary action times
   * TODO: add more analysis cases
   */
  engageNextInQ () {
    var next = this.q.object.posts[0];
    if (next === null) {
      this.handleError('404');
      return;
    }

    if (!this.secondsPerLike) this.secondsPerLike = 0;
    if (!this.timeOffset) this.timeOffset = 0;

    var self = this;
    this.analyzePost(next, function (action) {
      setTimeout(function () {
        switch (action) {
          case 'like':
            self.Tumblr.likePost(next, function (err) {
              if (err) self.handleError(err);
              else {
                // istanbul ignore next
                if (process.env.NODE_ENV !== 'test') console.log('LIKED BLOG >>> '.cyan, next.blog_name.bgWhite.black);
                self.q.object.sessionLikes++;
                self.q.write();
                self.cleanUp(next);
              }
            });
            break;
          case 'follow':
            self.Tumblr.followBlog(next, function (err) {
              if (err) self.handleError(err);
              else {
                // istanbul ignore next
                if (process.env.NODE_ENV !== 'test') console.log('FOLLOWED BLOG >>> '.cyan, next.blog_name.bgWhite.black);
                self.q.object.sessionFollows++;
                self.q.write();
                self.cleanUp(next);
              }
            });
            break;
          case 'sleep':
            self.sleep();
        }
      }, self.timeOffset * 1000)
    });
  },

  /*
   * Blogs with more than 5,000 posts tend to be "active" users,
   * so let's follow them since they're more engaged
   * TODO: write better analysis criteria / algorithms
   */
  analyzePost (post, cb) {
    var likes = this.q.object.sessionLikes;
    var maxLikes = this.q.object.max_likes > 1000 ? 1000 : this.q.object.max_likes;
    var follows = this.q.object.sessionFollows;
    var maxFollows = this.q.object.max_follows > 200 ? 200 : this.q.object.max_follows;

    if (likes >= maxLikes && follows < maxFollows) cb('follow');
    else if (likes >= maxLikes && follows >= maxFollows) cb('sleep')
    else {
      var self = this;
      this.Tumblr.lookUpBlog(post.blog_name, function (err, resp) {
        if (err) self.handleError(err);
        else if (resp.blog.posts > 5000) cb('follow')
        else cb('like');
      });
    }
  },

  /*
   * Finding new posts via Tumblr's "tagged" method
   * (https://www.tumblr.com/docs/en/api/v2#tagged-method)
   * We also dont want to repeat the same tags until we've
   * used all the other ones at least once, so this cross
   * references "usedTags" to filter those out
   */
  searchRandomTag: function (cb) {
    var hashtags = this.client.tags, randomTag;
    var usedTags = this.q.object.usedTags || [];
    var availableTags = _.difference(hashtags, usedTags);

    if (!_.isEmpty(availableTags)) {
      randomTag = _.sample(availableTags);
      this.q('usedTags').push(randomTag);
    } else {
      delete this.q.object.usedTags;
      this.q.write();
      randomTag = _.sample(hashtags);
      this.q('usedTags').push(randomTag);
    }

    // istanbul ignore next
    if (process.env.NODE_ENV !== 'test') console.log('SEARCHING FOR RANDOM TAG >>> '.yellow + randomTag);
    // here we add 'foundBy' key to know which tag we searched later
    this.Tumblr.searchForPosts(randomTag, {}, function(err, resp) {
       if (err) cb (err);
       else {
         resp.forEach(function (r) {
           r.foundBy = randomTag;
         });
         cb(null, resp);
       }
    });
  },

  /*
   * Remove post from Q and start next action
   */
  cleanUp (post) {
    this.q.object.posts = _.without(this.q.object.posts, post);
    this.q.write();
    this.determineNext();
  },

  /*
   * Next actions is determined by how much time
   * left in the day vs how many likes have been made
   * and what our limits are. the max is 1000 likes a day
   * and 100 follows
   */
  determineNext () {
    var likes = this.q.object.sessionLikes;
    var maxLikes = this.client.max_likes > 1000 ? 1000 : this.client.max_likes;
    var likesLeft = maxLikes - likes;

    var seshStart = moment(this.q.object.sessionStart);
    var duration = moment.duration(moment().diff(seshStart)).asSeconds();
    var secondsLeft = 86400 - duration; // 86,400 = seconds in a day
    this.secondsPerLike = Math.round(secondsLeft / likesLeft);
    // subtract timeOffset because we waited this much to trigger engagement
    var nextAction = this.secondsPerLike - this.timeOffset;
    // create a new time offset now so we can accurately log the next action
    this.timeOffset = Math.floor(Math.random() * this.secondsPerLike);

    var self = this;

    // istanbul ignore next
    if (process.env.NODE_ENV !== 'test') console.log('RE-ENGAGING IN >>> '.green + (nextAction + this.timeOffset).toString().magenta + 's'.magenta);
    // istanbul ignore next
    if (process.env.NODE_ENV !== 'test') console.log('');

    setTimeout(function() {
      self.init();
    }, nextAction * 1000);
  },

  /*
   * Error handler
   */
  handleError (err) {
    // istanbul ignore next
    if (process.env.NODE_ENV !== 'test') console.log(err.toString().red);
    if (err.toString().indexOf('404') > -1) {
       delete this.q.object.posts[0];
       this.q.write();
    }
    this.determineNext();
  },

  /*
   * Sleep app until next day
   */
  sleep () {
    var seshStart = moment(this.q.object.sessionStart);
    var duration = moment.duration(moment().diff(seshStart)).asSeconds();
    var secondsLeft = 86400 - duration; // 86,400 = seconds in a day

    var self = this;
    setTimeout(function () {
      self.init();
    }, secondsLeft * 1000);
  },
}

module.exports = EngageTumblr;
