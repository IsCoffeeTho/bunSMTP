import SMTPServer from "./SMTP/server";
import type { EmailServerOptions } from "./email";

export default class server {
	SMTP: SMTPServer;
	constructor(opt?: EmailServerOptions) {
		this.SMTP = new SMTPServer(opt?.smtp ?? { ipaddr:"127.0.0.1", port:2525 });
	}

	begin() {
		this.SMTP.begin();
		// this.IMAP.begin();
	}
}