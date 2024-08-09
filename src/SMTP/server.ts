import type { TLSOptions } from "bun";
import bunSMTP  from "../..";
import SMTPAgent from "./agent";
import EventEmitter from "events";
import net from "net";

export default class SMTPServer extends EventEmitter {
	tls?: TLSOptions;
	#implicit: boolean;
	server: net.Server;
	authMethods: bunSMTP.AuthMethod[] = [];
	constructor(opt: bunSMTP.SMTPServerOptions) {
		super();
		this.tls = opt.tls;
		this.#implicit = !!opt.isImplicit; // coerces undefined to false, and boolean to its value
		if (opt?.auth)
			this.authMethods.push(...opt.auth);
		var _this = this;
		this.server = net.createServer((socket) => {
			var sessionID = "*".repeat(40).replace(/./g, () => {
				return "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random()*36)]				
			});
			var agent = new SMTPAgent(_this, socket);
		});
	}

	begin(addr: string, port: number | string) {
		if (typeof port == "string")
			port = parseInt(port);
		this.server.on("error", (err) => { throw err; });
		this.server.listen(port, addr);
	}
}
