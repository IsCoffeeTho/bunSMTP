import type { SMTPServerOptions } from "../email";
import SMTPClient from "./client";

export default class SMTPServer {
	addr: string;
	port: number;
	constructor(opt?: SMTPServerOptions) {
		this.addr = opt?.ipaddr ?? "127.0.0.1";
		this.port = opt?.port ?? 2525;
	}

	begin() {
		Bun.listen<SMTPClient>({
			hostname: this.addr,
			port: this.port,
			socket: {
				open(skt) {
					skt.data = new SMTPClient(skt);
				},
				data(skt, data) {
					skt.data.onData(data);
				}
			}
		})
	}
}