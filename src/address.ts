import { MailAddressRegex } from "../.";

export default class mailAddress {
	localPart: string;
	domain: string;
	constructor(addr: string) {
		if (!addr.match(MailAddressRegex))
			throw new SyntaxError("Address is not MailAddress Like");
		var atIndex = addr.lastIndexOf("@");
		this.localPart = addr.slice(0, atIndex);
		this.domain = addr.slice(atIndex + 1);
	}

	toString() {
		return `${this.localPart}@${this.domain}`;
	}
}
