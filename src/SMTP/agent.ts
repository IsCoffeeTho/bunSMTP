import { Socket } from "net";
import pkg from "../../package.json";
import parseMachine from "../parseMachine";
import mailAddress from "../address";
import { rfc822parser } from "../mail";
import TLS from "node:tls";
import { Duplex } from "node:stream";
import type SMTPServer from "./server";
import bunSMTP, { MailAddressRegex, SMTPLineRegex } from "../..";

enum clientState {
	HANDSHAKE,
	CONNECTED,
	IDLE,
	TRANSPORT,
	HEADERS,
	MESSAGE,
	AUTHING,
	STARTTLS,
	TLS_NEGOTIATE,
	CLOSED
}

enum clientRole {
	undetermined,
	sender,
	reciever
}

type mailBufferType = {
	from: mailAddress,
	to: mailAddress[],
	builder: rfc822parser
}

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc2821}
 */
export default class SMTPAgent {
	socket: Socket;
	role: clientRole = clientRole.undetermined;
	state: clientState = clientState.HANDSHAKE;
	#server: SMTPServer;
	#packetBuffer: string = "";
	#mailBuffer: mailBufferType = {
		from: new mailAddress("null@null"),
		to: [],
		builder: new rfc822parser()
	};
	constructor(server: SMTPServer, socket: Socket) {
		this.#server = server;
		this.socket = socket;
	}

	HELO() {
		this.send(`220 ${process.env["HOSTNAME"]} ESMPT ${pkg.name} v${pkg.version}`);
	}

	onCommand(command: string, params: string[]) {
		if (command == "NOOP") {
			return this.send("240 OK");
		} else if (command == "QUIT") {
			this.socket.end("221 Bye\r\n");
			this.state = clientState.CLOSED;
			return;
		}

		switch (this.state) {
			case clientState.CLOSED:
				return;
			case clientState.CONNECTED:
				this.state = clientState.IDLE;
				if (command.startsWith("HTTP")) { // stops fetch requests from sending emails
					this.state = clientState.CLOSED;
					this.socket.end();
					return;
				}
				if (command == "HELO") this.send(`250 OK`);
				else if (command == "EHLO") {
					var extendedHELO: string[] = [];
					extendedHELO.push(`${process.env["HOSTNAME"]}`);
					if (this.#server.authMethods.length != 0)
						extendedHELO.push(`AUTH ${this.#server.authMethods.join(" ")}`);
					extendedHELO.push('STARTTLS');
					this.send(...extendedHELO.map((v, i, a) => {
						if (i == a.length)
							return `250 ${v}`;
						return `250-${v}`;
					}));
				}
				else {
					this.state = clientState.CONNECTED;
					this.send("503 Bad sequence of commands (HELO or EHLO expected)");
				}
				return;
			case clientState.IDLE:
				if (command == "AUTH") {
					/** @TODO Implement auth */
					this.send('235 AUTH not implemented yet');
					this.role = clientRole.sender;
				} else if (command == "MAIL") {
					const fromLine = new parseMachine(params[0]);
					fromLine.capture(/FROM:/g);
					fromLine.capture(/[^<]*</g);
					var addr = fromLine.capture(MailAddressRegex);
					if (!addr) return this.send("501 email address is invalid");
					this.#mailBuffer = {
						from: new mailAddress(addr),
						to: [],
						builder: new rfc822parser()
					}
					this.state = clientState.TRANSPORT;
					this.send("250 OK");
				} else {
					this.send(`500 Unrecognized Command`);
				}
				return;
			case clientState.TRANSPORT:
				if (command == "RCPT") {
					const fromLine = new parseMachine(params[0]);
					fromLine.capture(/TO:[^<]*</g);
					var addr = fromLine.capture(MailAddressRegex);
					if (!addr) return this.send("501 email address is invalid");
					var mailaddr = new mailAddress(addr);
					if (this.#mailBuffer.to.indexOf(mailaddr) != -1)
						return this.send("250 Address Already Recipient");
					// if (!this.#serverFunctions.verify(mailaddr))
					// 	return this.send("252 User not verifiable");
					this.#mailBuffer.to.push(mailaddr);
					this.send("250 OK");
				} else if (command == "DATA") {
					if (this.#mailBuffer.to.length == 0) {
						this.send("550 No Valid Recipients have been provided");
						return;
					}
					this.state = clientState.MESSAGE;
					this.send("354 End data with <CR><LF>.<CR><LF>");
				} else this.send(`535 Bad sequence of commands`);
				return;
			default:
				this.send(`503 Impossible Client State`);
				if (this.state > clientState.CONNECTED) this.state = clientState.IDLE;
				return;
		}
	}

	send(...data: string[]) {
		this.socket.write(data.join("\r\n") + "\r\n");
	}

	onSocket(data: Buffer) {
		this.onData(data);
	}

	onData(data: Buffer) {
		var packet = data.toString();
		this.#packetBuffer += packet;

		if (packet.indexOf("\r\n") == -1) return;

		var pm = new parseMachine(this.#packetBuffer);

		while (true) {
			if (this.state == clientState.MESSAGE) {
				var builder = this.#mailBuffer.builder;
				while (pm.hasTok()) {
					builder.raw += pm.tok();
					pm.adv();
					if (builder.raw.endsWith("\r\n.\r\n")) break;
				}
				if (builder.raw.endsWith("\r\n.\r\n")) {
					builder.raw = builder.raw.slice(0, -5);
					this.state = clientState.IDLE;
					this.send("250 OK");
					(async () => {
						var mail = builder.build();
						mail.Sender = this.#mailBuffer.from;
						mail.Recipients = this.#mailBuffer.to;
						this.#server.emit("mail", mail);
					})();
				}
				break;
			}
			var line = pm.capture(SMTPLineRegex);
			if (!line) return;
			var cpm = new parseMachine(line);
			var command = cpm.capture(/[A-Za-z]+/g);
			var args: string[] = [];
			while (cpm.hasTok()) {
				cpm.capture(/ */g);
				var arg = cpm.capture(/("[^"]+")[^ ]*|[^ ]+/g);
				if (!arg) break;
				if (arg.endsWith("\r\n")) arg = arg.slice(0, -2);
				if (arg.length > 0) args.push(arg);
			}
			if (command) this.onCommand(command.toUpperCase(), args);

			this.#packetBuffer = pm.commit();
			if (this.#packetBuffer.indexOf("\r\n") == -1) return;
		}
	}
}
