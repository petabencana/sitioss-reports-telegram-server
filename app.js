// CogniCity Telegram Reports Module

// External modules
const Telegraf = require('telegraf'),
      request = require('request');
require('dotenv').config({silent:true});

// Telegraf bot
const app = new Telegraf(process.env.BOT_TOKEN);

// GRASP card
const options = {
  host: 'https://data-dev.petabencana.id',
  path: '/cards',
  method: 'POST',
  port: 80,
  headers: {
    'x-api-key': process.env.X_API_KEY,
    'Content-Type': 'application/json'
  }
}

const langs = {
  '/banjir': 'id',
  '/flood': 'en'
}

const replies = {
  'id': 'Hi! Laporan menggunakan link ini, terima kasih',
  'en': 'Hi! Report using this link, thanks'
}

var get_card = function(ctx, callback){

  // Get language
  var language = process.env.DEFAULT_LANG;
  if (ctx.update.message.text in langs){
    var language = langs[ctx.update.message.text]
  }

  var card_request = {
    "username": ctx.from.id.toString(),
    "network": "telegram",
    "language": language
  }

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
      callback(null, replies[language] + '\n' + process.env.CARD_PATH + body.cardId);
    }
    else {
      var err = 'Error getting card: ' + JSON.stringify(error) + JSON.stringify(response);
      callback(err, null);
    }
  });
}


app.command('start', (ctx) => {
  ctx.reply("Hi! Saya Bencana Bot.\n/banjir - laporan banjir ");
});

app.command(['flood', 'banjir'], (ctx) => {
  console.log('Received flood report request');

  get_card(ctx, function(err, response){
    if (!err){
      console.log('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      console.log('Error getting card: ' + err);
    }
  });
});
// emergi!
//app.on('sticker', (ctx) => ctx.reply('👍'));
app.startPolling();
console.log('App is polling Telegram API');
