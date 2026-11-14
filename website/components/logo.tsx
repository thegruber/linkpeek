// The favicon mark: angle brackets, the shape of the <head> linkpeek reads.
export function Logo() {
	return (
		<span className="inline-flex items-center gap-2 font-semibold tracking-tight">
			<svg viewBox="0 0 64 64" aria-hidden="true" className="size-6">
				<rect width="64" height="64" rx="12" fill="#165dff" />
				<path
					d="m26 18-14 14 14 14m12-28 14 14-14 14"
					fill="none"
					stroke="#fff"
					strokeWidth="7"
				/>
			</svg>
			linkpeek
		</span>
	);
}
