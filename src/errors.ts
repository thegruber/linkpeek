/** Machine-readable failure categories thrown by linkpeek. */
export type LinkpeekErrorCode =
	| "INVALID_URL"
	| "UNSUPPORTED_PROTOCOL"
	| "PRIVATE_NETWORK_BLOCKED"
	| "SENSITIVE_HEADER"
	| "INVALID_OPTIONS"
	| "TOO_MANY_REDIRECTS"
	| "TIMEOUT"
	| "FETCH_FAILED";

/**
 * Error thrown by `preview()` and `parseHTML()` for invalid input, blocked
 * targets, timeouts and network failures (`FETCH_FAILED`, with the original
 * error as `cause`). Check `code` to branch on the failure category
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
