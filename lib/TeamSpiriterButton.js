const dashButton = require('node-dash-button');
const dateFns = require('date-fns');
const TeamSpiriter = require('./TeamSpiriter');

class TeamSpiriterButton {
  static async create(options) {
    options = Object.assign({}, options || {});
    const teamSpiriter = await TeamSpiriter.create(options);
    if (!options.macAddress)
      throw new Error('Mac address is required');
    const locale = options.locale || 'ja-JP';
    const timezone = options.timezone || 'Asia/Tokyo';
    return new TeamSpiriterButton(teamSpiriter, options.macAddress, locale, timezone);
  }

  constructor(teamSpiriter, macAddress, locale, timezone) {
    this._teamSpiriter = teamSpiriter;
    this._macAddress = macAddress;
    this._locale = locale;
    this._timezone = timezone;
  }

  async launch() {
    const dash = dashButton(this._macAddress, null, null, 'all');
    console.log("TeamSpiriterButton launched.");
    dash.on("detected", async () => {
      console.log("Detected. Starting to record work time.");
      // Workaround for handling timezone
      const now = dateFns.parse(new Date().toLocaleString(this._locale, { timeZone: this._timezone }));
      const resultIn = await this._teamSpiriter.startWork(now, false);
      if (!resultIn) {
        await this._teamSpiriter.endWork(now, true);
      }
      console.log("Finished to record work time.");
    });
  }
}

module.exports = TeamSpiriterButton;
