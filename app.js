// CogniCity Telegram Reports Module
// With Multihazard prompts
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
  '/baha': 'tl',
  '/flood': 'en'
}

// Replies to user
const replies = {
  'tl': 'Hi! Paki-ulat ang kalamidad sa iyong lugar gamit ang link na ito. Salamat!',
  'en': 'Hi! Please report the disaster in your area using this link. Thank you!'
}

// Confirmation message to user
const confirmations = {
  'tl': 'Salamat sa iyong ulat! Tignan at ibahagi ang iyong ulat gamit ang link na ito! #ReduceRiskTogether',
  'en': "Thank you for your report! View and share your report using this link! #ReduceRiskTogether"
}

// Function to get GRASP card from CogniCity API
var get_card = function(ctx, lang, callback, disasterType){

  // Get language
  // var language = config.DEFAULT_LANG;
  // if (ctx.update.message.text in langs){
  //   var language = langs[ctx.update.message.text]
  // }

  // Form JSON request body
  var card_request = {
    "username": ctx.from.id.toString(), //We use the numeric id as this allows telegram replies
    "network": "telegram",
    "language": lang
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
      callback(null, replies[lang] + '\n' + config.CARD_PATH + body.cardId + '/' + disasterType );
    }
    else {
      var err = 'Error getting card: ' + JSON.stringify(error) + JSON.stringify(response);
      callback(err, null); // Return error
    }
  });
}

// start command
app.command(['start'], (ctx) => {
	ctx.reply("Kumusta ka? Ako si Kalamidad Bot! Pindutin ang /ulat upang i-report ang sakuna malapit sa iyo. How are you? I'm disaster bot! Click /report to report disasters near you.");
});
app.command(['mulai'], (ctx) => {
  ctx.reply("Kumusta ka? Ako si Kalamidad Bot! Pindutin ang /ulat upang i-report ang sakuna malapit sa iyo. How are you? I'm disaster bot! Click /report to report disasters near you.");
});

app.command('report', (ctx) => {
  return ctx.reply('Please select disaster to report', Markup
    .keyboard([
      ['Flood' ,'Earthquake' , 'Volcano' , 'Typhoon'],
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

app.command('ulat', (ctx) => {
  return ctx.reply('Silahkan pilih bencana yang ingin kamu laporkan', Markup
    .keyboard([
      ['Baha' , 'Lindol' , 'Bulkan' , 'Bagyo'], // Row1 with 2 buttons
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

// report command
app.command(['flood'], (ctx) => {
  replyCardLink(ctx, 'flood', 'en');
});

app.command(['baha'], (ctx) => {
  replyCardLink(ctx, 'flood', 'tl');
});

app.command(['earthquake',], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'en');
});

app.command(['lindol',], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'tl');
});

app.command(['volcano'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'en');
});

app.command(['bulkan'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'tl');
});

app.command(['typhoon'], (ctx) => {
  replyCardLink(ctx, 'typhoon', 'en');
});

app.command(['bagyo'], (ctx) => {
  replyCardLink(ctx, 'typhoon', 'tl');
});




app.hears(['Flood'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'en')
})

app.hears(['Baha'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'tl')
})

app.hears(['Earthquake',], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'en');
});

app.hears(['Lindol',], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'tl');
});

app.hears(['Volcano'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'en');
});

app.hears(['Bulkan'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'tl');
});

app.hears(['Typhoon'], (ctx) => {
  replyCardLink(ctx, 'typhoon', 'en');
});

app.hears(['Bagyo'], (ctx) => {
  replyCardLink(ctx, 'typhoon', 'tl');
});


// emergi!
//app.on('sticker', (ctx) => ctx.reply('👍'));

// Start telegram connection
app.startPolling();
logger.info('App is polling Telegram API');;

function replyCardLink(ctx, disasterType, lang) {
  logger.debug('Received report request:'+disasterType);
  // Get a card
  get_card(ctx, lang, function (err, response) {
    if (!err) {
      logger.debug('Received card, reply to user');
      ctx.reply(response);
    }
    else {
      logger.error('Error getting card: ' + err);
    }
  }, disasterType);
}
