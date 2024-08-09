import type { TLSOptions } from "bun";

import SMTPServer from "./src/SMTP/server";
export { SMTPServer };

export const MailAddressRegex = /([A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+|"[^ "]+")@([A-Za-z0-9\-\.]+|\[(\d+\.\d+\.\d+\.\d+|IPv6(:[a-fA-F0-9]{0,4}){2,8})\])/g;
export const SMTPLineRegex = /[^\r]*\r\n([ \t][^\r]*\r\n)*/g;

import type { mailEnvelope } from "./src/mail";
import type mailAddress from "./src/address";

export default bunSMTP;

declare namespace bunSMTP {
	export type SMTPServerOptions = {
		tls: TLSOptions,
		isImplicit?: boolean,
		auth?: AuthMethod[],
		onAUTH?(ctx: AuthContext): boolean | void,
		onVRFY(address: mailAddress): boolean | void,
		onMail(mail: mailEnvelope): void,
	};

	export type AuthContext = {
		type: "XOAUTH2",
		user: string,
		token: string
	} | {
		type: "OAUTHBEARER"
	} | {
		type: "OAUTH10A"
	} | {
		type: "CRAM-MD5"
	} | {
		type: "MD5"
	} | {
		type: "DIGEST-MD5"
	} | {
		type: "LOGIN",
		username: string,
		password: string
	} | {
		type: "PLAIN",
		content: string
	};

	export type AuthMethod = AuthContext["type"];
}