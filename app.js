var figlet = require('figlet');
var colors = require('colors');
var EngageTumblr = require('./engagers/EngageTumblr');
var client_api = require('./config');
var engagement;

console.log('')
console.log('')
console.log('                  #######'.white)
console.log('                   #######'.white)
console.log('                    #######'.white)
console.log('                     #######'.white)
console.log('                    /\\'.grey + '#######'.white)
console.log('                   /||\\'.grey + '#######'.white)
console.log('                  //||\\\\'.grey + '#######'.white)
console.log('                 ///||\\\\\\'.grey + '#######'.white)
console.log('                ////||\\\\\\\\'.grey + '#######'.white)
console.log('               /////||\\\\\\\\\\'.grey + '#######'.white)
console.log('              //////||\\\\\\\\\\\\'.grey + '#######'.white)
console.log('             ///////||\\\\\\\\\\\\\\'.grey + '#######'.white)
console.log('')
console.log('                  ' + 'ARTIMATE 1.0'.green.bold.underline)
console.log('')
console.log('                TUMBLR'.blue + ' EDITION'.green)
console.log('')
console.log('')

engagement = new EngageTumblr(client_api);
