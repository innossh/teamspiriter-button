const TeamSpiriterButton = require('./lib/TeamSpiriterButton');

(async () => {
	const teamSpiriterButton = await TeamSpiriterButton.create(
		{
			macAddress: 'xx:xx:xx:xx:xx:xx',
			dedicatedNumber: '1234',
			username: 'foo@example.com',
			password: 'password'
		}
	);
	await teamSpiriterButton.launch();
})();
