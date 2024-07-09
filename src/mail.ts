import mailAddress from "./address";
import { SMTPLineRegex } from "./email.d";
import parseMachine from "./parseMachine";

import { writeFileSync } from "fs";

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
			line = line.slice(0, -2);
			if (line.length == 0)
				break;
			var headerPM = new parseMachine(line);
			var headerName = headerPM.capture(/[^:]+/g);
			if (!headerName)
				continue; // discard header
			headerPM.capture(/:\s*/g); // remove leading whitespace
			envelope.headers.set(headerName, headerPM.commit().replace(/\r\n(\s)+/g, (g, wsp) => wsp));
		}
		var MIMEType = envelope.headers.get("Content-Type");
		if (!MIMEType?.startsWith("multipart/alternative;")) {
			envelope.body = pm.commit();
			return envelope;
		}
		var boundarySegment = MIMEType.match(/boundary="([^"]+)"/g);
		var boundary = "";
		if (boundarySegment) {
			boundary = boundarySegment[0].slice('boundary="'.length,-1);
		}
		envelope.body = {};
		envelope.boundary = boundary;
		var multipart = pm.commit().split(`--${boundary}`);
		multipart.pop();
		multipart.shift();
		for (var part in multipart) {
			var section = multipart[part];
			if (section.startsWith("--"))
				break;
			var envelopePart = new mailEnvelope();
			var partPM = new parseMachine(section.slice(2));
			while (partPM.hasTok()) {
				var line = partPM.capture(SMTPLineRegex);
				if (!line)
					break;
				line = line.slice(0, -2);
				if (line.length == 0)
					break;
				var headerPM = new parseMachine(line);
				var headerName = headerPM.capture(/[^:]+/g);
				if (!headerName)
					continue; // discard header
				headerPM.capture(/:\s*/g); // remove leading whitespace
				envelopePart.headers.set(headerName, headerPM.commit().replace(/\r\n(\s)+/g, (g, wsp) => wsp));
			}
			envelopePart.body = partPM.commit();
			envelope.body[(envelopePart.headers.get("Content-Type")?.match(/[^;]+/g) ?? ["unknown/undefined"])[0]] = envelopePart;
		}
		return envelope;
	}
}

export class mailEnvelope {
	headers: Map<string, string> = new Map<string, string>();
	body: string | { [type: string]: mailEnvelope } = "";
	boundary?: string;
	
	asEML() {
		var headers = "";
		this.headers.forEach((v, k) => {
			headers += `${k}: ${v}\r\n`;
		})
		if (typeof this.body == "string")
			return `${headers}\r\n${this.body}`;
		var body = "";
		for (var type in this.body) {
			var section = this.body[type];
			body += `\r\n--${this.boundary}\r\n`;
			body += section.asEML();
		}
		return `${headers}${body}\r\n--${this.boundary}--`;
	}
}