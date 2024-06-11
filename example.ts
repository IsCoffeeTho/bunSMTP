import email from "./.";

const server = new email.server({
	spool: `${__dirname}/.spool`,
	smtp: {
		ipaddr: process.env["SMTP_ADDR"],
		port: 2525
	}
});

server.begin();