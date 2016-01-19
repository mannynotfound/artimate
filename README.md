
<p align="center">
  <!-- lol -->
  <img src="https://raw.githubusercontent.com/artnotfound/artimate/master/coverage.png" />
  <br />
  <img src="https://raw.githubusercontent.com/artnotfound/artimate/master/artimate.png" />
</p>


# Artimate

Artimate is a node app that enables the automation of your social media accounts so you can focus on producing content,
A.K.A. a shameless social media marketing bot. 

## Motivation

I could talk about the growing struggles of having to be an artist, promoter, manager, etc but the real motivation is to be able to masturbate/post on twitter/eat shit
and still feel like im being productive. 

## Usage

### tumblr:
  * follow the beginning [these steps](http://www.nextscripts.com/setup-installation-tumblr-social-networks-auto-poster-wordpress/) to set up a Tumblr app
  * use the `oauth_tumblr.py` included in the utils to get a token + token secret
  * input consumer key, consumer secret, token, token secret into `config.json`
  * place hashtags you want to search as an array in `tags`
  * run `node app`

## Features
  * Local storage via [lowdb](https://github.com/typicode/lowdb), so if app is interrupted/crashes you can pick up where you left off
  * Smart filtering; Users are never engaged more than once to maximize spread of engagements per day
  * Sessions; app will run in sessions of 24 hours and will reach Tumblr's limit of 1000 likes a day unless this number is overriden in `config.json`
  * Random interval actions; Actions are dynamically calculated to run at random intervals while reaching engagement api limits
  * Colorful console log output via [colors](https://www.npmjs.com/package/colors)
  * Engagement history saved to `logs/[platform]/engaged.json`

## TODO:
  * Add support for Twitter & Instagram
  * More discovery methods & better post analysis
  * Refactor tests, theyre messy and slow right now, especially those using proxyquire
  * Figure out a console.log solution because they clog up test console output + coverage reports
  * Make oauth process part of the app

## Contributing:
  * PLEASE DO. 
  * Write tests. this kind of shit needs tests.
  * Use pre-babel JS, trying to keep this lean and ez to run / hack at

