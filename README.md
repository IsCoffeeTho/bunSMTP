# bunSMTP

Runs a very minimal SMTP server on bun.

```ts
// example.ts
import bunSMTP from "./.";
import type mailAddress from "./src/address";
import type mailEnvelope from "./src/mail";

const server = new bunSMTP.server({
	host: "::",
	port: 1465,
	tls: {
		cert: Bun.file(process.env["SMTP_CERT"] ?? ""),
		key: Bun.file(process.env["SMTP_KEY"] ?? "")
	}
});

server.verifyAddress((address: mailAddress) => {
	if (address.localPart == "contact")
		return true;
	return false;
});

server.mail((mail: mailEnvelope) => {
	console.log(mail);
});

server.begin();
```

## Usage

```bash
bun install bunSMTP
``` 