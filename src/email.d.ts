import type { TLSOptions } from "bun";

type ServerOption = {
	ipaddr?: string,
	port?: number,
	tls?: TLSOptions
};

export type SMTPServerOptions = ServerOption & {

};

export type IMAPServerOptions = ServerOption & {

};

export type EmailServerOptions = {
	smtp: SMTPServerOptions
}


type SMTP_AUTH_PLAIN = {
	type: "PLAIN",
	value: string
}

type SMTP_AUTH_DIGESTMD5 = {
	type: "DIGEST-MD5"
}

type SMTP_AUTH_GSSAPI = {
	type: "GSSAPI"
}

export type SMTPAuthObject = SMTP_AUTH_PLAIN | SMTP_AUTH_DIGESTMD5 | SMTP_AUTH_GSSAPI;

/** @TODO Implement IMAP*/
export type IMAPAuthObject = {};

export type EmailAuth = ({
	protocol: "SMTP"
} & SMTPAuthObject) | ({
	protocol: "IMAP"
} & IMAPAuthObject)

export type MailObject = {
	from: string,
	to: string[],
	body: string
};