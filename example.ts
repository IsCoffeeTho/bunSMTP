import bunSMTP, {SMTPServer} from ".";
import type mailAddress from "./src/address";
import type { mailEnvelope } from "./src/mail";

const server = new SMTPServer({
	tls: {
		cert: Bun.file(process.env["SMTP_CERT"] ?? ""),
		key: Bun.file(process.env["SMTP_KEY"] ?? "")
	},
	auth: [
		"NONE"
	],
	onAUTH(ctx: bunSMTP.AuthContext) {
		
	},
	onVRFY(address: mailAddress) {
		if (address.localPart == "contact")
			return true;
		return false;
	},
	onMail(mail: mailEnvelope) {
		console.log(mail);
	}
});

server.begin(process.env["SMTP_ADDR"] ?? "localhost", process.env["SMTP_PORT"] ?? 1025);