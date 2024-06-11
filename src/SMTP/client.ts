import type { Socket } from "bun";
import pkg from "../../package.json";
import parseMachine from "../parseMachine";

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
	AUTHING,
	ABORTED
}

/**
 * @see {@link https://datatracker.ietf.org/doc/html/rfc2821}
 */
export default class SMTPClient {
	socket: Socket<SMTPClient>;
	state: clientState;
	#packetBuffer: string;
	constructor(socket: Socket<SMTPClient>) {
		this.socket = socket;
		this.send(`220 ${process.env["HOSTNAME"]} ESMPT emailjs v${pkg.version}`);
		this.state = clientState.CONNECTED;
		this.#packetBuffer = "";
	}

	onCommand(command: string, params: string[]) {
		console.log(command, params);
		if (command == "HELP") {
			if (this.state != clientState.CONNECTED)
				return this.send("503 Bad sequence of commands (HELO or EHLO expected)");
			/** @TODO Add Help Response */
			this.send(`214`); // help response
		}

		switch (this.state) {
			case clientState.CONNECTED:
				this.state = clientState.IDLE;
				if (command == "HELO")
					this.send(`250 OK\r\n`);
				else if (command == "EHLO") {
					this.send(`250-${process.env["HOSTNAME"]}`, `250-AUTH PLAIN GSSAPI DIGEST-MD5`, `250 HELP`);
				} else {
					this.state = clientState.CONNECTED;
					this.send("503 Bad sequence of commands (HELO or EHLO expected)");
				}
				return;
			case clientState.IDLE:
				if (command == "MAIL") {
					this.state = clientState.COMPOSING;
				} else if (command == "AUTH") {
					this.state = clientState.AUTHING;
					switch (params[0]) {
						case "PLAIN":
							console.log(base64decode(params[1]));
							this.send('252 PLAIN has been disabled (Mail is still available)');
							return;
						case "DIGEST-MD5":
							/** @see {@link https://datatracker.ietf.org/doc/html/rfc2831} */ 
							this.send('334 ');
							return;
						default:
							this.send('534 Authentication Mechanism Not Supported (Try Another)');
							return;
					}
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

		while (true) {
			var line = pm.capture(/[^\r]+\r\n(\s[^\r]\r\n)*/g);
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