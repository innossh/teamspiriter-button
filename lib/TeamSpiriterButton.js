const dashButton = require('node-dash-button');
const TeamSpiriter = require('./TeamSpiriter');

class TeamSpiriterButton {
    static async create(options) {
        const teamSpiriter = await TeamSpiriter.create(options);
        return new TeamSpiriterButton(teamSpiriter, options);
    }

    constructor(teamSpiriter, options) {
        this.teamSpiriter = teamSpiriter;
        this.macAddress = options.macAddress;
    }

    async launch() {
        const dash = dashButton(this.macAddress, null, null, 'all');
        dash.on("detected", () => {
            console.log('Detected');
            const now = new Date();
            await this.teamSpiriter.recordWorkTime(now, now, false, true);
            console.log('Recorded work time');
        });
    }
}

module.exports = TeamSpiriterButton;
