import type { Socket } from "bun";
import pkg from "../../package.json";
import parseMachine from "../parseMachine";
import type { MailObject, SMTPAuthObject } from "../email";

const base64bucket = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64decode(str: string) {
	var accumulator = 0;
	var offset = 0;
	var output = "";
	for (var i = 0; i < str.length; i++) {
		var value = 0;
		if (str[i] != '=')
			value = base64bucket.indexOf(str[i]);
		if (value < 0)
			throw new Error("Invalid Characters in base64 String");
		accumulator <<= 6;
		accumulator |= value;
		if (offset > 0) { output += String.fromCharCode((accumulator >> (6 - offset)) & 0xff); }
		offset += 2;
		offset %= 8;
	}
	if (offset != 0)
		throw new Error("Invalid Padding");
	return output;
}

function base64encode(string: string) {

	// return output;
}

enum clientState {
	CONNECTED,
	IDLE,
	COMPOSING,
	MESSAGE,
	AUTHING,
	CLOSED
}

type serverFunctionList = {
	auth(credentials: SMTPAuthObject): boolean | void,
	verify(address: string): boolean | void,
	mail(packet: MailObject): any
};

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc2821}
 */
export default class SMTPClient {
	socket: Socket<SMTPClient>;
	state: clientState;
	#packetBuffer: string;
	#serverFunctions: serverFunctionList;
	#mailBuffer: MailObject;
	constructor(socket: Socket<SMTPClient>, serverFNs: serverFunctionList) {
		this.socket = socket;
		this.send(`220 ${process.env["HOSTNAME"]} ESMPT emailjs v${pkg.version}`);
		this.state = clientState.CONNECTED;
		this.#packetBuffer = "";
		this.#serverFunctions = serverFNs;
		this.#mailBuffer = {
			from: "",
			to: [],
			body: ""
		};
	}

	onCommand(command: string, params: string[]) {
		console.log(command, params);
		if (command == "HELP") {
			if (this.state != clientState.CONNECTED)
				return this.send("503 Bad sequence of commands (HELO or EHLO expected)");
			/** @TODO Add Help Response */
			this.send(`214`); // help response
		} else if (command == "QUIT") {
			this.send("221 Bye");
			this.socket.shutdown();
			this.state = clientState.CLOSED;
			return;
		}

		switch (this.state) {
			case clientState.CLOSED:
				return;
			case clientState.CONNECTED:
				this.state = clientState.IDLE;
				if (command == "HELO")
					this.send(`250 OK`);
				else if (command == "EHLO") {
					this.send(`250-${process.env["HOSTNAME"]}`, `250-AUTH PLAIN GSSAPI DIGEST-MD5`, `250 HELP`);
				} else {
					this.state = clientState.CONNECTED;
					this.send("503 Bad sequence of commands (HELO or EHLO expected)");
				}
				return;
			case clientState.IDLE:
				if (command == "MAIL") {
					const fromLine = new parseMachine(params[0]);
					fromLine.capture(/FROM:</g);
					var addr = fromLine.capture(/([A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+|"[^ "]+")@([A-Za-z0-9\-\.]+|\[(\d+\.\d+\.\d+\.\d+|IPv6(:[a-fA-F0-9]{0,4}){2,8})\])/g);
					if (!addr)
						return this.send("501 email address is invalid");
					this.#mailBuffer = {
						from: addr,
						to: [],
						body: ""
					};
					this.send("250 OK");
					this.state = clientState.COMPOSING;
				} else if (command == "AUTH") {
					this.state = clientState.AUTHING;
					var authObj: SMTPAuthObject;
					switch (params[0]) {
						case "PLAIN":
							authObj = {
								type: "PLAIN",
								value: base64decode(params[1])
							};
							break;
						case "DIGEST-MD5":
							/** @see {@link https://datatracker.ietf.org/doc/html/rfc2831} */
							authObj = {
								type: "DIGEST-MD5"
							};
							break;
						default:
							this.send('534 Authentication Mechanism Not Supported (Try Another)');
							return;
					}
					if (this.#serverFunctions.auth(authObj)) {
						this.send('235 Authentication Successful');
					} else {
						this.send(`535 Bad sequence of commands`);
					}
				}
				return;
			case clientState.COMPOSING:
				if (command == "RCPT") {
					const fromLine = new parseMachine(params[0]);
					fromLine.capture(/TO:</g);
					var addr = fromLine.capture(/([A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+|"[^ "]+")@([A-Za-z0-9\-\.]+|\[(\d+\.\d+\.\d+\.\d+|IPv6(:[a-fA-F0-9]{0,4}){2,8})\])/g);
					if (!addr)
						return this.send("501 email address is invalid");
					this.#mailBuffer.to.push(addr);
					this.send("250 OK");
				} else if (command == "DATA") {
					this.state = clientState.MESSAGE;
					this.send("354 End data with <CR><LF>.<CR><LF>")
				} else {
					this.send(`535 Bad sequence of commands`);
				}
				return;
			default:
				this.send(`503 Impossible Client State`);
				if (this.state > clientState.CONNECTED)
					this.state = clientState.IDLE;
				return;
		}
	}

	send(...data: string[]) {
		console.log(data);
		this.socket.write(data.join("\r\n") + "\r\n");
	}

	onData(data: Buffer) {
		var packet = data.toString()
		this.#packetBuffer += packet;

		if (packet.indexOf('\r\n') == -1)
			return;

		var pm = new parseMachine(this.#packetBuffer);
		if (this.state == clientState.MESSAGE) {
			while (pm.hasTok()) {
				this.#mailBuffer.body += pm.tok();
				pm.adv();
				if (this.#mailBuffer.body.endsWith("\r\n.\r\n"))
					break;
			}
			if (this.#mailBuffer.body.endsWith("\r\n.\r\n")) {
				this.#mailBuffer.body = this.#mailBuffer.body.slice(0, -5);
				console.log(this.#mailBuffer);
				this.send("250 OK");
			}
		}
		while (true) {
			var line = pm.capture(/[^\r]*\r\n(\s[^\r]\r\n)*/g);
			if (!line)
				return;
			var cpm = new parseMachine(line);
			var command = cpm.capture(/[A-Za-z]+/g);
			var args: string[] = [];
			while (cpm.hasTok()) {
				cpm.capture(/ */g);
				var arg = cpm.capture(/("[^"]")|[^ ]+/g);
				if (!arg)
					break;
				if (arg.endsWith("\r\n"))
					arg = arg.slice(0, -2);
				if (arg.length > 0)
					args.push(arg);
			}
			if (command)
				this.onCommand(command.toUpperCase(), args);

			this.#packetBuffer = pm.commit();
			if (this.#packetBuffer.indexOf('\r\n') == -1)
				return;
		}
	}
}