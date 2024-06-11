type ServerOption = {
	ipaddr?: string,
	port?: number
};

export type SMTPServerOptions = ServerOption & {
	
};

export type IMAPServerOptions = ServerOption & {
	
};

export type EmailServerOptions = {
	spool: string,
	smtp: SMTPServerOptions
}