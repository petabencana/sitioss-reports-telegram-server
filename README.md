# cognicity-reports-telegram
Telegram support for CogniCity GRASP

### Install
`npm install`

### Creating a bot in Telegram
* You can create a bot as instructed [here](https://core.telegram.org/bots#6-botfather)

### Run
`node app.js`

### Configuration
Save a copy of sample.env as .env in local directory with appropriate credentials
* 'BOT_TOKEN': The token required to authenticate bots and send requests to the Bot API
* 'DEFAULT_LANG': Language codes (Used in this repo: 'en' and 'id')
* 'CARD_PATH': The frontend url to view cards
* 'APP': The frontend url to view maps
* 'API_SERVER': The server url to receive card OTL from
* 'X_API_KEY': The key needed to make calls to the server
* 'PG_CON": Postgres database connection string

#### Misc Notes
- grasp "username" is actually Telegram user ID or conversation ID to allow replies in conversation
- errors are logged to console, but not returned to user currently

#### Bot commands
* For Indonesia :
  * `/report` issue report card in English
  * `/laporan` issue report card in Indonesian
  * `/start` issue initial text in Indonesian

* For India:
  * `/flood` issue flood report card in English
  * `/start` issue initial text in English
