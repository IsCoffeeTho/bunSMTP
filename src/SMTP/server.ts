import type { TCPSocketListenOptions, TLSOptions } from "bun";
import type { MailObject, SMTPAuthObject, SMTPServerOptions } from "../email";
import SMTPClient from "./client";

export default class SMTPServer {
	addr: string;
	port: number;
	tls?: TLSOptions;
	#authFn: ((credentials: SMTPAuthObject) => any);
	#verifyFn: ((address: string) => (boolean | void));
	#mailFn: ((mail: MailObject) => any);
	constructor(opt?: SMTPServerOptions) {
		this.addr = opt?.ipaddr ?? "127.0.0.1";
		this.port = opt?.port ?? 2525;
		this.tls = opt?.tls;
		this.#authFn = () => { return false };
		this.#verifyFn = () => { return false };
		this.#mailFn = () => { return false };
	}

	auth(fn: (credentials: SMTPAuthObject) => (boolean | void)) { this.#authFn = fn; }
	verify(fn: (address: string) => (boolean | void)) { this.#verifyFn = fn; }
	mail(fn: (mail: MailObject) => any) { this.#mailFn = fn; }

	begin() {
		var serverFunctions = {
			auth: this.#authFn,
			verify: this.#verifyFn,
			mail: this.#mailFn
		}
		var socketBuild: TCPSocketListenOptions<SMTPClient> = {
			hostname: this.addr,
			port: this.port,
			socket: {
				open(skt) {
					skt.data = new SMTPClient(skt, serverFunctions);
				},
				data(skt, data) {
					skt.data.onData(data);
				}
			}
		};

		if (this.tls)
			socketBuild.tls = this.tls;

		Bun.listen<SMTPClient>(socketBuild);
	}
}