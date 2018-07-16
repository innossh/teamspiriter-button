const dashButton = require('node-dash-button');
const TeamSpiriter = require('./TeamSpiriter');

class TeamSpiriterButton {
  static async create(options) {
    options = Object.assign({}, options || {});
    const teamSpiriter = await TeamSpiriter.create(options);
    if (!options.macAddress)
      throw new Error('Mac address is required');
    return new TeamSpiriterButton(teamSpiriter, options.macAddress);
  }

  constructor(teamSpiriter, macAddress) {
    this._teamSpiriter = teamSpiriter;
    this._macAddress = macAddress;
  }

  async launch() {
    const dash = dashButton(this._macAddress, null, null, 'all');
    dash.on("detected", () => {
      const now = new Date();
      await this._teamSpiriter.recordWorkTime(now, now, false, true);
    });
  }
}

module.exports = TeamSpiriterButton;
