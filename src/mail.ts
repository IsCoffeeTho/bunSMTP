import mailAddress from "./address";
import { SMTPLineRegex } from "./email.d";
import parseMachine from "./parseMachine";

export default class mailEnvelope {
	from: mailAddress;
	to: mailAddress[];
	raw: string;
	headers: Map<string, string>;
	body: string;
	constructor() {
		this.from =	mailAddress.NULL;
		this.to = [];
		this.raw = "";
		this.headers = new Map<string, string>();
		this.body = "";
	}

	build() {
		this.headers.clear();
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
			this.headers.set(headerName, headerPM.commit().replace(/\r\n(\s)+/g, (g, wsp) => wsp));
		}
		this.body = pm.commit();
	}

	static NULL = new mailEnvelope();
}