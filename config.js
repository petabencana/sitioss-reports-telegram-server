require('dotenv').config({silent:true});

var config = {
  LOG_CONSOLE: process.env.LOG_CONSOLE === 'true' || false,
  LOG_DIR: process.env.LOG_DIR || '',
  LOG_JSON: process.env.LOG_JSON === 'true' || false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'error',
  LOG_MAX_FILE_SIZE: process.env.LOG_MAX_FILE_SIZE || 1024 * 1024 * 100,
  APP_NAME: process.env.APP_NAME || 'cognicity-reports-telegram',
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || 10
}

module.exports = config;
