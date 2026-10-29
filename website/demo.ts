import { parseHTML } from "../src/parse.js";

const form = document.querySelector<HTMLFormElement>("#parser-form");
const input = document.querySelector<HTMLTextAreaElement>("#sample-html");
const includeBody = document.querySelector<HTMLInputElement>("#include-body");
const output = document.querySelector<HTMLElement>("#parsed-output");
const status = document.querySelector<HTMLElement>("#demo-status");
const submit = document.querySelector<HTMLButtonElement>("#parse-button");

if (form && input && includeBody && output && status && submit) {
	const extract = () => {
		try {
			// Keep local demo work bounded even if input was set programmatically.
			const result = parseHTML(
				input.value.slice(0, 30_000),
				"https://example.com/",
				{
					includeBodyContent: includeBody.checked,
				},
			);
			output.textContent = JSON.stringify(
				{
					title: result.title,
					description: result.description,
					image: result.image,
					siteName: result.siteName,
					statusCode: result.statusCode,
				},
				null,
				2,
			);
			status.textContent = "Metadata extracted locally.";
		} catch {
			status.textContent =
				"Could not parse this sample. Try a smaller HTML document.";
		}
	};
	submit.disabled = false;
	extract();
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		extract();
	});
}
