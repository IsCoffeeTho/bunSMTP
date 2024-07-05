import mailAddress from "./address";
import { SMTPLineRegex } from "./email.d";
import parseMachine from "./parseMachine";

import {writeFileSync} from "fs";

export class rfc822parser {
	raw: string;
	constructor() {
		this.raw = "";
	}

	build() {
		var envelope = new mailEnvelope();
		var pm = new parseMachine(this.raw);
		while (pm.hasTok()) {
			var line = pm.capture(SMTPLineRegex);
			if (!line)
				break;
			line = line.slice(0,-2);
			if (line.length == 0)
				break;
			var headerPM = new parseMachine(line);
			var headerName = headerPM.capture(/[^:]+/g);
			if (!headerName)
				continue; // discard header
			headerPM.capture(/:\s*/g); // remove leading whitespace
			envelope.headers.set(headerName, headerPM.commit().replace(/\r\n(\s)+/g, (g, wsp) => wsp));
		}
		envelope.body = pm.commit();
		return envelope;
	}
}

export class mailEnvelope {
	headers: Map<string, string> = new Map<string, string>();
	body: string = "";

	asEML() {
		var headers = "";
		this.headers.forEach((v, k) => {
			headers += `${k}=${v}\r\n`;
		})
		return `${headers}\r\n${this.body}`;
	}
}