import email from "./.";
import type { EmailAuth, SMTPAuthObject } from "./src/email";

const server = new email.server({
	smtp: {
		ipaddr: process.env["SMTP_ADDR"],
		port: 2525
	}
});

server.auth((credentials: EmailAuth) => {

});

server.inboundMail(() => {
	
});

server.begin();