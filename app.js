// CogniCity Telegram Reports Module

// External modules
const Telegraf = require('telegraf'),
      request = require('request'),
      logger = require('winston'),
      path = require('path'),
      config = require('./config'),
      pg = require('pg'),
      { Extra, Markup } = require('telegraf');
// Set the default logging level
logger.level = config.LOG_LEVEL;

// Check that log file directory can be written to
try {
	config.LOG_DIR !== '' && fs.accessSync(config.LOG_DIR, fs.W_OK);
	logger.info(`Logging to ${config.LOG_DIR !== '' ? config.LOG_DIR : 'current working directory' }`);
} catch(e) {
	// If we cannot write to the desired directory then log in the current directory
	logger.info(`Cannot log to '${config.LOG_DIR}', logging to current working directory instead`);
	config.LOG_DIR = '';
}

// Configure the logger
logger.add(logger.transports.File, {
	filename: path.join(config.LOG_DIR, `${config.APP_NAME}.log`),
	json: config.LOG_JSON, // Log in json or plain text
	maxsize: config.LOG_MAX_FILE_SIZE, // Max size of each file
	maxFiles: config.LOG_MAX_FILES, // Max number of files
	level: config.LOG_LEVEL // Level of log messages
})

// If we are not in development and console logging has not been requested then remove it
//if (config.NODE_ENV !== 'development' && !config.LOG_CONSOLE) {
//	logger.remove(logger.transports.Console);
//}

// Telegraf bot
const app = new Telegraf(config.BOT_TOKEN);

// GRASP card
const options = {
  host: config.API_SERVER,
  path: '/cards',
  method: 'POST',
  port: 80,
  headers: {
    'x-api-key': config.X_API_KEY,
    'Content-Type': 'application/json'
  }
}

// GRASP operating regions
const instance_regions = {
  jbd: 'jakarta',
  sby: 'surabaya',
  bdg: 'bandung',
  srg: 'semarang'
}

// Telegram language hack
const langs = {
  '/banjir': 'id',
  '/flood': 'en'
}

// Replies to user
const replies = {
  'id': 'Hi! Laporkan menggunakan link ini. Terima kasih.',
  'en': 'Hi! Report using this link, thanks.'
}

// Confirmation message to user
const confirmations = {
  'id': 'Hi! Terima kasih atas laporan Anda. Aku sudah menaruhnya di peta.',
  'en': "Hi! Thanks for your report. I've put it on the map."
}

// Function to get GRASP card from CogniCity API
var get_card = function(ctx, callback){

  // Get language
  var language = config.DEFAULT_LANG;
  if (ctx.update.message.text in langs){
    var language = langs[ctx.update.message.text]
  }

  // Form JSON request body
  var card_request = {
    "username": ctx.from.id.toString(), //We use the numeric id as this allows telegram replies
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
      callback(null, replies[language] + '\n' + config.CARD_PATH + 'flood/' + body.cardId);
    }
    else {
      var err = 'Error getting card: ' + JSON.stringify(error) + JSON.stringify(response);
      callback(err, null); // Return error
    }
  });
}

// Function to watch for udpates to grasp.cards table, received status
var watch_cards = function(callback){
     // Connect to db
     pg.connect(config.PG_CON, function(err, client, done){
       if (err){
         logger.error("database err: " + err);
         done();
         callback( new Error('Database connection error') );
         return;
       }
       // Return the listen notification
       client.on('notification', function(msg) {
         try{
          logger.info('Msg: ' + msg);
          logger.info('Payload: ' + msg.payload);
          var notification = JSON.parse(msg.payload);
          logger.info('Parse successful');
          if (notification.cards.network === 'telegram'){
            logger.info('Received card submission');
            callback(null, notification.cards);
          }
         }
         catch (e){
           logger.error('Error processing listen notification from database\n'+e);
           callback(e);

           return;
         }
       });

       // Initiate the listen query
       client.query("LISTEN watchers");
     });
}

// start command
app.command(['start', 'mulai'], (ctx) => {
  ctx.reply("Hi! Saya BencanaBot.\nKetik /banjir untuk melaporkan banjir");
});

app.command('menu', (ctx) => {
  return ctx.reply('Custom buttons keyboard', Markup
	.keyboard([
	  ['🔍 Search', '😎 Popular'], // Row1 with 2 buttons
	  ['☸ Setting', '📞 Feedback'], // Row2 with 2 buttons
	  ['📢 Ads', '⭐️ Rate us', '👥 Share'] // Row3 with 3 buttons
	])
	.oneTime()
	.resize()
        .extra()
  )
})

// report command
app.command(['flood', 'banjir'], (ctx) => {
  logger.debug('Received flood report request');

  // Get a card
  get_card(ctx, function(err, response){
    if (!err){
      logger.debug('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      logger.error('Error getting card: ' + err);
    }
  });
});
// emergi!
//app.on('sticker', (ctx) => ctx.reply('👍'));

// Start telegram connection
app.startPolling();
logger.info('App is polling Telegram API');

// Start watcing for user reports
watch_cards(function(err, report){
  if (!err){
    var reply = confirmations[report.language]
    reply += ' ' + config.MAP_PATH + instance_regions[report.report_impl_area] + '/' + report.report_id;
    app.telegram.sendMessage(parseInt(report.username), reply);
  }
});
