const address = "xx:xx:xx:xx:xx:xx";
const dash_button = require('node-dash-button');

const dash = dash_button(address, null, null, 'all');
dash.on("detected", () => {
	console.log('detected');
});
