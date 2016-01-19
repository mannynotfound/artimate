var figlet = require('figlet');
var colors = require('colors');
var EngageTumblr = require('./engagers/EngageTumblr');
var client_api = require('./config');
var engagement;

figlet.text('ARTIMATE', {
  font: 'ANSI Shadow',
  horizontalLayout: 'default',
  verticalLayout: 'default'
  }, function (err, data) {
    if (err) {
      console.log(err.toString().red);
      return;
    }
    console.log('');
    console.log('');
    console.log(data.rainbow);
    console.log('TUMBLR EDITION'.bold.blue);
    console.log('v1.0'.bold.green);
    console.log('');
    console.log('');
    engagement = new EngageTumblr(client_api);
});

