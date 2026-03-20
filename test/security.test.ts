import { describe, expect, it } from "vitest";
import { isPrivateHost, validateUrl } from "../src/fetch.js";

describe("validateUrl", () => {
	it("allows http URLs", () => {
		expect(() => validateUrl("http://example.com")).not.toThrow();
	});

	it("allows https URLs", () => {
		expect(() => validateUrl("https://example.com")).not.toThrow();
	});

	it("rejects ftp URLs", () => {
		expect(() => validateUrl("ftp://example.com")).toThrow(
			"Only http and https URLs are supported",
		);
	});

	it("rejects file URLs", () => {
		expect(() => validateUrl("file:///etc/passwd")).toThrow(
			"Only http and https URLs are supported",
		);
	});

	it("rejects javascript URLs", () => {
		expect(() => validateUrl("javascript:alert(1)")).toThrow(
			"Only http and https URLs are supported",
		);
	});

	it("rejects invalid URLs", () => {
		expect(() => validateUrl("not a url")).toThrow("Invalid URL");
	});

	it("rejects empty string", () => {
		expect(() => validateUrl("")).toThrow("Invalid URL");
	});

	it("blocks localhost", () => {
		expect(() => validateUrl("http://localhost/admin")).toThrow("private");
	});

	it("blocks 127.0.0.1", () => {
		expect(() => validateUrl("http://127.0.0.1")).toThrow("private");
	});

	it("blocks 10.x.x.x", () => {
		expect(() => validateUrl("http://10.0.0.1")).toThrow("private");
	});

	it("blocks 172.16-31.x.x", () => {
		expect(() => validateUrl("http://172.16.0.1")).toThrow("private");
		expect(() => validateUrl("http://172.31.255.255")).toThrow("private");
	});

	it("allows 172.15.x.x and 172.32.x.x", () => {
		expect(() => validateUrl("http://172.15.0.1")).not.toThrow();
		expect(() => validateUrl("http://172.32.0.1")).not.toThrow();
	});

	it("blocks 192.168.x.x", () => {
		expect(() => validateUrl("http://192.168.1.1")).toThrow("private");
	});

	it("blocks 169.254.x.x (link-local / cloud metadata)", () => {
		expect(() =>
			validateUrl("http://169.254.169.254/latest/meta-data/"),
		).toThrow("private");
	});

	it("blocks .local domains", () => {
		expect(() => validateUrl("http://myhost.local")).toThrow("private");
	});

	it("blocks .localhost domains", () => {
		expect(() => validateUrl("http://app.localhost:3000")).toThrow("private");
	});

	it("blocks IPv6 loopback", () => {
		expect(() => validateUrl("http://[::1]")).toThrow("private");
	});

	it("blocks IPv6 unique local (fc/fd)", () => {
		expect(() => validateUrl("http://[fd00::1]")).toThrow("private");
	});

	it("blocks IPv6 link-local (fe80)", () => {
		expect(() => validateUrl("http://[fe80::1]")).toThrow("private");
	});

	it("allows public IPs when allowPrivateIPs is false", () => {
		expect(() => validateUrl("http://8.8.8.8")).not.toThrow();
		expect(() => validateUrl("http://93.184.216.34")).not.toThrow();
	});

	it("allows private IPs when allowPrivateIPs is true", () => {
		expect(() => validateUrl("http://localhost", true)).not.toThrow();
		expect(() => validateUrl("http://127.0.0.1", true)).not.toThrow();
		expect(() => validateUrl("http://10.0.0.1", true)).not.toThrow();
		expect(() => validateUrl("http://192.168.1.1", true)).not.toThrow();
		expect(() => validateUrl("http://169.254.169.254", true)).not.toThrow();
	});
});

describe("isPrivateHost", () => {
	it("detects 0.x.x.x as private", () => {
		expect(isPrivateHost("0.0.0.0")).toBe(true);
	});

	it("returns false for public hostnames", () => {
		expect(isPrivateHost("example.com")).toBe(false);
		expect(isPrivateHost("google.com")).toBe(false);
	});
});
