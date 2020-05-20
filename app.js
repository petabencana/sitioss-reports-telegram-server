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
  ctx.reply("Hai! Saya Bencana Bot! Klik /laporkan untuk memilih bencana yang ingin kamu laporkan. Hi! I'm Disaster Bot! Click /report to select the disaster you would like to report");
});
app.command(['mulai'], (ctx) => {
  ctx.reply("Hai! Saya Bencana Bot! Klik /laporkan untuk memilih bencana yang ingin kamu laporkan. Hi! I'm Disaster Bot! Click /report to select the disaster you would like to report");
});

app.command('report', (ctx) => {
  return ctx.reply('Please select disaster to report', Markup
    .keyboard([
      ['Flood'], // Row1 with 2 buttons
      ['Earthquake'], // Row2 with 2 buttons
      // ['Volcano', 'Extreme Wind'] // Row3 with 2 buttons
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

app.command('laporkan', (ctx) => {
  return ctx.reply('Silahkan pilih bencana yang ingin kamu laporkan', Markup
    .keyboard([
      ['Banjir'], // Row1 with 2 buttons
      ['Gempa'], // Row2 with 2 buttons
      // ['Gunung Api', 'Angin Kencang'] // Row3 with 2 buttons
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

app.command(['banjir'], (ctx) => {
  replyCardLink(ctx, 'flood', 'id');
});

// app.command(['fire',], (ctx) => {
//   replyCardLink(ctx, 'fire');
// });

app.command(['earthquake'], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'en');
});

app.command(['gempa'], (ctx) => {
  replyCardLink(ctx, 'earthquake', 'id');
});

// app.command(['haze'], (ctx) => {
//   replyCardLink(ctx, 'haze');
// });

// app.command(['volcano'], (ctx) => {
//   replyCardLink(ctx, 'volcano');
// });
// app.command(['wind'], (ctx) => {
//   replyCardLink(ctx, 'wind');
// });

app.hears(['Flood'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'en')
})

app.hears(['Banjir'], (ctx) => {
  return replyCardLink(ctx, 'flood', 'id')
})

app.hears(['Earthquake'], (ctx) => {
  return replyCardLink(ctx, 'earthquake', 'en')
})

app.hears(['Gempa'], (ctx) => {
  return replyCardLink(ctx, 'earthquake', 'id')
})
// app.hears(['Forest Fire', 'Kebakaran Hutan'], (ctx) => {
//   return replyCardLink(ctx, 'fire')
// })
// app.hears(['Haze', 'Kabut Asap'], (ctx) => {
//   return replyCardLink(ctx, 'haze')
// })
// app.hears(['Volcano', 'Gunung Api'], (ctx) => {
//   return replyCardLink(ctx, 'volcano')
// })
// app.hears(['Extreme Wind', 'Angin Kencang'], (ctx) => {
//   return replyCardLink(ctx, 'wind')
// })

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

