import settingsLib from 'settings-lib';
import socks5 from 'simple-socks';
import winston from 'winston';

async function loadSettings () {
	return await settingsLib.initialize({
		baseSettingsPath : './settings/defaults.yml'
	})
}

function prepareLogger (settings) {
	return winston.createLogger({
		format : winston.format.combine(
			winston.format.colorize(),
			winston.format.splat(),
			winston.format.timestamp(),
			winston.format.prettyPrint(),
			winston.format.printf((info) => {
				if (typeof info.message !== 'string') {
					return `${info.timestamp} [${info.level}]: ${JSON.stringify(info.message, 0, 2)}`;
				}

				return `${info.timestamp} [${info.level}]: ${info.message}`;
			})),
		level : settings.logging.level,
		transports : [
			new winston.transports.Console()
		]
	});
}

module.exports = (async (app) => {
	app.settings = await loadSettings();
	app.log = prepareLogger(app.settings);

	// log out settings to verbose
	app.log.verbose('SOCKS5 server settings loaded...')
	app.log.verbose(app.settings);

	// begin listening for inbound connections
	app.server.listen(app.settings.server.port);
	app.log.info('SOCKS5 server listening on %d', app.settings.server.port);

	// when a new connection occurs
	app.server.on(socks5.events.HANDSHAKE, function (socket) {
		app.log.debug('new SOCKS5 request from %s:%d', socket.remoteAddress, socket.remotePort);
	});

	// when a request is received for a remote destination
	app.server.on(socks5.events.PROXY_CONNECT, function (info, destination) {
		app.log.debug('connected to remote server at %s:%d', info.host, info.port);

		destination.on('data', function (data) {
			app.log.silly('data (%d bytes) received from remote server', data.length);
		});
	});

	// when data is communicated to the client
	app.server.on(socks5.events.PROXY_DATA, function (data) {
		app.log.silly('data (%d bytes) sent to connected client', data.length);
	});

	// when an error occurs connecting to remote destination
	app.server.on(socks5.events.PROXY_ERROR, function (err) {
		app.log.warning('unable to connect to remote server');
		app.log.warning(err);
	});

	// when a proxy connection ends
	app.server.on(socks5.events.PROXY_END, function (response, args) {
		app.log.verbose('socket closed with code %d', response, args);
	});

})({
	server : socks5.createServer()
});
