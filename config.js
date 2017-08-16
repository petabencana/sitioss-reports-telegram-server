require('dotenv').config({silent:true});

var config = {
  APP_NAME: process.env.APP_NAME || 'cognicity-reports-telegram',
  API_SERVER: process.env.API_SERVER || 'https://data.petabencana.id/',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  DEFAULT_LANG: process.env.DEFAULT_LANG || 'en',
  CARD_PATH: process.env.CARD_PATH || 'https://cards.petabencana.id/',
  LOG_CONSOLE: process.env.LOG_CONSOLE === 'true' || false,
  LOG_DIR: process.env.LOG_DIR || '/tmp/cognicity',
  LOG_JSON: process.env.LOG_JSON === 'true' || false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'error',
  LOG_MAX_FILE_SIZE: process.env.LOG_MAX_FILE_SIZE || 1024 * 1024 * 100,
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || 10,
  MAP_PATH: process.env.MAP_PATH || 'https://petabencana.id/map/',
  PG_CON: process.env.PG_CON || 'postgres://postgres@localhost/cognicity',
  X_API_KEY: process.env.X_API_KEY || ''
}

module.exports = config;
