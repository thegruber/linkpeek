// Site-wide enhancements: a copy button on every code block. Without
// JavaScript or the Clipboard API the code stays selectable as before.

if (navigator.clipboard) {
	for (const pre of document.querySelectorAll<HTMLPreElement>(".doc pre")) {
		const wrapper = document.createElement("div");
		wrapper.className = "code-block";
		pre.replaceWith(wrapper);
		const button = document.createElement("button");
		button.type = "button";
		button.className = "copy-button";
		button.textContent = "Copy";
		let reset: ReturnType<typeof setTimeout> | undefined;
		button.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(pre.innerText.trimEnd());
				button.textContent = "Copied";
			} catch {
				button.textContent = "Press Ctrl+C";
			}
			clearTimeout(reset);
			reset = setTimeout(() => {
				button.textContent = "Copy";
			}, 1600);
		});
		wrapper.append(pre, button);
	}
}
