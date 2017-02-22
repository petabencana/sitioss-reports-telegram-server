// CogniCity Telegram Reports Module

// External modules
const Telegraf = require('telegraf'),
      request = require('request'),
      pg = require('pg');
require('dotenv').config({silent:true});

// Telegraf bot
const app = new Telegraf(process.env.BOT_TOKEN);

// GRASP card
const options = {
  host: 'http://localhost:8001',
  path: '/cards',
  method: 'POST',
  port: 80,
  headers: {
    'x-api-key': process.env.X_API_KEY,
    'Content-Type': 'application/json'
  }
};

// GRASP operating regions
const instance_regions = {
  jbd: 'jakarta',
  sby: 'surabaya',
  bdg: 'bandung'
};

// Commands as per disaster


// Telegram language hack
const langs = {
  '/flood': 'en',
  '/hurricane': 'en',
  '/earthquake': 'en',
  '/report': 'en'
};

// Replies to user
const replies = {
  'en': 'Hi! Report using this link, thanks.'
};

// Confirmation message to user
const confirmations = {
  'en': "Hi! Thanks for your report. I've put it on the map."
};

// Function to get GRASP card from CogniCity API
var get_card = function(ctx, command, callback) {

  // Get language
  var language = process.env.DEFAULT_LANG;
  if (ctx.update.message.text in langs){
    language = langs[ctx.update.message.text];
  }

  // Form JSON request body
  var card_request = {
    "username": ctx.from.id.toString(), //We use the numeric id as this allows telegram replies
    "network": "telegram",
    "language": language
  };

  // Get a card
  request({
    url: options.host+options.path,
    method: options.method,
    headers: options.headers,
    port: options.port,
    json: true,
    body: card_request

  }, function(error, response, body){
    if (!error && response.statusCode === 200){
      callback(null, replies[language] + '\n' + process.env.CARD_PATH + command + '/' + body.cardId + "/report");
    }
    else {
      var err = 'Error getting card: ' + JSON.stringify(error) + JSON.stringify(response);
      callback(err, null); // Return error
    }
  });
};

// Function to watch for udpates to grasp.cards table, received status
var watch_cards = function(callback) {
     // Connect to db
     pg.connect(process.env.PG_CON, function(err, client, done){
       if (err){
         console.log("database err: " + err);
         done();
         callback( new Error('Database connection error') );
         return;
       }
       // Return the listen notification
       client.on('notification', function(msg) {
         try{
          console.log('Msg: ' + msg);
          console.log('Payload: ' + msg.payload);
          var notification = JSON.parse(msg.payload);
          console.log('Parse successful');
          if (notification.cards.network === 'telegram'){
            console.log('Received card submission');
            callback(null, notification.cards);
          }
         }
         catch (e){
           console.log('Error processing listen notification from database\n'+e);
           callback(e);

           return;
         }
       });

       // Initiate the listen query
       client.query("LISTEN watchers");
     });
};

// start command
app.command('start', (ctx) => {
  ctx.reply("Hi! Risk Map Bot.\n/report - Post disaster reporting \n/flood - Flood report \n/earthquake - Post earthquake report \n/hurricane - Post hurricane report");
});

// report command
app.command(['flood'], (ctx) => {
  console.log('Received flood report request');

  // Get a card
  get_card(ctx, 'flood' ,function(err, response) {
    if (!err){
      console.log('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      console.log('Error getting card: ' + err);
    }
  });
});

// report command
app.command(['hurricane'], (ctx) => {
  console.log('Received hurricane report request');

  // Get a card
  get_card(ctx, 'hurricane' ,function(err, response) {
    if (!err){
      console.log('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      console.log('Error getting card: ' + err);
    }
  });
});

// report command
app.command(['earthquake'], (ctx) => {
  console.log('Received earthquake report request');

  // Get a card
  get_card(ctx, 'earthquake' ,function(err, response) {
    if (!err){
      console.log('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      console.log('Error getting card: ' + err);
    }
  });
});

// report command
app.command(['report'], (ctx) => {
  console.log('Received FEMA report request');

  // Get a card
  get_card(ctx, 'report' ,function(err, response) {
    if (!err){
      console.log('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      console.log('Error getting card: ' + err);
    }
  });
});


// Start telegram connection
app.startPolling();
console.log('App is polling Telegram API');

// Start watcing for user reports
watch_cards(function(err, report){
  if (!err) {
    var reply = confirmations[report.language];
    reply += ' ' + process.env.APP + instance_regions[report.report_impl_area] + '/' + report.report_id;
    app.telegram.sendMessage(parseInt(report.username), reply);
  }
});
