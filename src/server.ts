import SMTPServer from "./SMTP/server";
import type { EmailAuth, EmailServerOptions, MailObject } from "./email";

export default class server {
	SMTP: SMTPServer;
	constructor(opt?: EmailServerOptions) {
		this.SMTP = new SMTPServer(opt?.smtp ?? { ipaddr:"127.0.0.1", port:2525 });
	}

	auth(fn: (credentials: EmailAuth) => (boolean | void)) {
		this.SMTP.auth((SMTPClientAuth) => {
			var passthroughAuth: EmailAuth = {
				protocol: "SMTP",
				...SMTPClientAuth
			};
			return fn(passthroughAuth);
		});

		// this.IMAP.auth((IMAPClientAuth) => {
		// 	var passthroughAuth: EmailAuth = {
		// 		protocol: "IMAP",
		// 		...IMAPClientAuth
		// 	};
		// 	return fn(passthroughAuth);
		// });
	}

	inboundMail(fn: (mail: MailObject) => any) {
		this.SMTP.mail(fn);
	}

	begin() {
		this.SMTP.begin();
		// this.IMAP.begin();
	}
}