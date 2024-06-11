# emailjs

Provides an SMTP and IMAP server over TCP.

```ts
// 
import email from "./.";

const server = new email.server({
	smtp: {
		ipaddr: "192.168.1.X",
		port: 25,
		domain: "home.mail"
	}
});

server.auth((credentials) => {
	switch (credentials.type) {
		case "PLAIN":
			break;
		default:
			break;
	}
});

server.begin();
```

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```
