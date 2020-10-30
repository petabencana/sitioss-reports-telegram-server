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
app.command(['start'], (ctx) => {
  ctx.reply("Kumusta ka? Ako si Kalamidad Bot! Pindutin ang /baha upang i-report ang baha malapit sa iyo. How are you? I'm disaster bot! Click /flood to report flooding near you.");
});
app.command(['mulai'], (ctx) => {
  ctx.reply("Kumusta ka? Ako si Kalamidad Bot! Pindutin ang /baha upang i-report ang baha malapit sa iyo. How are you? I'm disaster bot! Click /flood to report flooding near you.");
});

app.command('report', (ctx) => {
  return ctx.reply('Please select disaster to report', Markup
    .keyboard([
      ['Flood'],
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

app.command('laporkan', (ctx) => {
  return ctx.reply('Silahkan pilih bencana yang ingin kamu laporkan', Markup
    .keyboard([
      ['Baha'], // Row1 with 2 buttons
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

app.command(['fire',], (ctx) => {
  replyCardLink(ctx, 'fire', 'en');
});

app.command(['kebakaran hutan',], (ctx) => {
  replyCardLink(ctx, 'fire', 'tl');
});

app.command(['earthquake'], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'en');
});

app.command(['gempa'], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'tl');
});

app.command(['haze'], (ctx) => {
  replyCardLink(ctx, 'haze', 'en');
});

app.command(['kabut asap'], (ctx) => {
  replyCardLink(ctx, 'haze', 'tl');
});

app.command(['volcano'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'en');
});

app.command(['gunung api'], (ctx) => {
  replyCardLink(ctx, 'volcano', 'tl');
});

app.command(['wind'], (ctx) => {
  replyCardLink(ctx, 'wind', 'en');
});

app.command(['angin kencang'], (ctx) => {
  replyCardLink(ctx, 'wind', 'tl');
});



app.hears(['Flood'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'en')
})

app.hears(['Baha'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'tl')
})

app.hears(['Earthquake'], (ctx) => {
  return replyCardLink(ctx, 'earthquake', 'en')
})

app.hears(['Gempa'], (ctx) => {
  return replyCardLink(ctx, 'earthquake', 'tl')
})
app.hears(['Forest Fire'], (ctx) => {
  return replyCardLink(ctx, 'fire', 'en')
})

app.hears(['Kebakaran Hutan'], (ctx) => {
  return replyCardLink(ctx, 'fire', 'tl')
})

app.hears(['Haze'], (ctx) => {
  return replyCardLink(ctx, 'haze', 'en')
})

app.hears(['Kabut Asap'], (ctx) => {
  return replyCardLink(ctx, 'haze', 'tl')
})

app.hears(['Volcano'], (ctx) => {
  return replyCardLink(ctx, 'volcano', 'en')
})

app.hears(['Gunung Api'], (ctx) => {
  return replyCardLink(ctx, 'volcano', 'tl')
})

app.hears(['Extreme Wind'], (ctx) => {
  return replyCardLink(ctx, 'wind', 'en')
})

app.hears(['Angin Kencang'], (ctx) => {
  return replyCardLink(ctx, 'wind', 'tl')
})

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

