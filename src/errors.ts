/** Machine-readable failure categories thrown by linkpeek. */
export type LinkpeekErrorCode =
	| "INVALID_URL"
	| "UNSUPPORTED_PROTOCOL"
	| "PRIVATE_NETWORK_BLOCKED"
	| "SENSITIVE_HEADER"
	| "INVALID_OPTIONS"
	| "TOO_MANY_REDIRECTS"
	| "TIMEOUT";

/**
 * Error thrown by `preview()` and `fetchUrl()` for invalid input, blocked
 * targets, and timeouts. Check `code` to branch on the failure category
 * instead of matching message strings.
 */
export class LinkpeekError extends Error {
	readonly code: LinkpeekErrorCode;

	constructor(
		code: LinkpeekErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "LinkpeekError";
		this.code = code;
	}
}
