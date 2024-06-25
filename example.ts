import email from "./.";
import type mailAddress from "./src/address";
import type mailEnvelope from "./src/mail";

const server = new email.SMTP.server({
	ipaddr: process.env["SMTP_ADDR"] ?? "localhost",
	port: parseInt(process.env["SMTP_PORT"] ?? "2525"),
	tls: {
		cert: Bun.file(process.env["SMTP_CERT"] ?? ""),
		key: Bun.file(process.env["SMTP_KEY"] ?? "")
	}
});

server.verifyAddress((address: mailAddress) => {
	if (address.localPart == "aaron") return true;
	return false;
});

server.mail((mail: mailEnvelope) => {
	console.log(mail);
});

server.begin();

console.log(server.addr, server.port);
