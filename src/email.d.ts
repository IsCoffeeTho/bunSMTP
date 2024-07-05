import type { TLSOptions } from "bun";

export const MailAddressRegex = /([A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+|"[^ "]+")@([A-Za-z0-9\-\.]+|\[(\d+\.\d+\.\d+\.\d+|IPv6(:[a-fA-F0-9]{0,4}){2,8})\])/g;
export const SMTPLineRegex = /[^\r]*\r\n([ \t][^\r]*\r\n)*/g;

export type SMTPServerOptions = {
	host?: string,
	port?: number,
	tls?: TLSOptions
};

export type MailObject = {
	from: string,
	to: string[],
	body: string
};