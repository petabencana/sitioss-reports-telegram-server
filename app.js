// CogniCity Telegram Reports Module

// External modules
const Telegraf = require('telegraf'),
      request = require('request');
require('dotenv').config({silent:true});

// Telegraf bot
const app = new Telegraf(process.env.BOT_TOKEN);

// GRASP card
var options = {
  host: 'https://data-dev.petabencana.id',
  path: '/cards',
  method: 'POST',
  port: 80,
  headers: {
    'x-api-key': process.env.X_API_KEY,
    'Content-Type': 'application/json'
  }
}

app.command('start', (ctx) => {
  ctx.reply("Hi! Saya Bencana Bot.\n/banjir - laporan banjir ");
});

app.command(['flood', 'banjir'], (ctx) => {

  console.log('Received flood report request');

  var card_request = {
    "username": ctx.from.id.toString(),
    "network": "telegram",
    "language": process.env.DEFAULT_LANG
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
      console.log('Received card, reply to user');
      ctx.reply('Hi! Laporkan menggunakan link ini '+ process.env.CARD_PATH + body.cardId + ' Terima kasih.');
    }
    else {
      console.log('Error getting card: ' + JSON.stringify(error) + JSON.stringify(response));
    }
  });
});
// emergi!
//app.on('sticker', (ctx) => ctx.reply('👍'));
app.startPolling();
console.log('App is polling Telegram API');
