import Link from "next/link";

export default function NotFound() {
	return (
		<main className="mx-auto grid max-w-xl flex-1 content-center gap-4 px-6 py-24">
			<p className="text-fd-muted-foreground text-sm">HTTP 404</p>
			<h1 className="font-semibold text-3xl tracking-tight">Page not found</h1>
			<p className="text-fd-muted-foreground">
				This page does not exist. The documentation starts at the quick start.
			</p>
			<p className="flex gap-3">
				<Link
					href="/quick-start/"
					className="inline-flex min-h-11 items-center rounded-xl bg-fd-primary px-5 font-medium text-fd-primary-foreground text-sm"
				>
					Read the quick start
				</Link>
				<Link
					href="/"
					className="inline-flex min-h-11 items-center rounded-xl border px-5 font-medium text-sm"
				>
					Home
				</Link>
			</p>
		</main>
	);
}
