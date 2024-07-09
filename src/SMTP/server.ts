import type { BunFile, TCPSocketListenOptions, TLSOptions } from "bun";
import type { SMTPServerOptions } from "../email.d";
import SMTPAgent from "./agent";
import type mailAddress from "../address";
import type { mailEnvelope } from "../mail";

export default class SMTPServer {
	addr: string;
	port: number;
	tls?: TLSOptions;
	#verifyFn: (address: mailAddress) => boolean | void;
	#mailFn: (mail: mailEnvelope) => any;
	constructor(opt?: SMTPServerOptions) {
		this.addr = opt?.host ?? "127.0.0.1";
		this.port = opt?.port ?? 2525;
		this.#verifyFn = () => {
			return false;
		};
		this.#mailFn = () => {
			return false;
		};
		if (opt?.tls)
			this.tls = opt.tls;
	}

	verifyAddress(fn: (address: mailAddress) => boolean | void) {
		this.#verifyFn = fn;
	}
	mail(fn: (mail: mailEnvelope) => any) {
		this.#mailFn = fn;
	}

	begin() {
		var serverFunctions = {
			verify: this.#verifyFn,
			mail: this.#mailFn
		};
		var _this = this;
		var socketBuild: TCPSocketListenOptions<SMTPAgent> = {
			hostname: this.addr,
			port: this.port,
			socket: {
				open(skt) {
					skt.data = new SMTPAgent(skt, serverFunctions);
				},
				data(skt, data) {
					skt.data.onSocket(data);
				}
			}
		};
		if (this.tls)
			socketBuild.tls = this.tls;
		Bun.listen<SMTPAgent>(socketBuild);
	}
}
