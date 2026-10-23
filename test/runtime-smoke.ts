/** Exercise native stream cancellation and caller aborts without network access. */
export async function runPreviewSmoke(
	preview: (
		url: string,
		options: { fetch: typeof fetch; signal?: AbortSignal },
	) => Promise<{ title: string | null }>,
): Promise<void> {
	let canceled = false;
	const body = new ReadableStream<Uint8Array>(
		{
			start(controller) {
				controller.enqueue(
					new TextEncoder().encode("<head><title>Streamed</title></head>"),
				);
			},
			pull(controller) {
				controller.error(new Error("Read beyond complete head"));
			},
			cancel() {
				canceled = true;
			},
		},
		{ highWaterMark: 0 },
	);
	const result = await preview("https://example.com", {
		fetch: async () =>
			new Response(body, { headers: { "content-type": "text/html" } }),
	});
	if (result.title !== "Streamed" || !canceled)
		throw new Error("Head cancellation failed");

	const abort = new AbortController();
	const reason = new Error("Caller canceled body");
	try {
		await preview("https://example.com", {
			signal: abort.signal,
			fetch: async (_url, init) =>
				new Response(
					new ReadableStream(
						{
							start(controller) {
								init?.signal?.addEventListener(
									"abort",
									() => controller.error(init.signal?.reason),
									{ once: true },
								);
							},
							pull() {
								abort.abort(reason);
							},
						},
						{ highWaterMark: 0 },
					),
					{ headers: { "content-type": "text/html" } },
				),
		});
		throw new Error("Caller abort unexpectedly fulfilled");
	} catch (error) {
		if (error !== reason) throw error;
	}
}
