// The linkpeek mark: two eyes peeking over an edge. The edge is </head>,
// where linkpeek stops reading; the pupils look up and right, toward the link.
export function Mark({ className = "size-6" }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" aria-hidden="true" className={`peek ${className}`}>
			<rect width="64" height="64" rx="16" fill="#165dff" />
			<path
				fill="#fff"
				d="M12 36h40a4 4 0 0 1 0 8H12a4 4 0 0 1 0-8zM10 36a11 11 0 0 1 22 0zM32 36a11 11 0 0 1 22 0z"
			/>
			<g className="peek-pupils">
				<circle cx="24.5" cy="30" r="4" fill="#165dff" />
				<circle cx="46.5" cy="30" r="4" fill="#165dff" />
			</g>
		</svg>
	);
}

/** The same eyes without the tile, in the current text color. */
export function Glyph({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 64 64"
			aria-hidden="true"
			className={`peek ${className ?? ""}`}
		>
			<path
				fill="currentColor"
				d="M12 36h40a4 4 0 0 1 0 8H12a4 4 0 0 1 0-8zM10 36a11 11 0 0 1 22 0zM32 36a11 11 0 0 1 22 0z"
			/>
			<g className="peek-pupils">
				<circle cx="24.5" cy="30" r="4" className="fill-fd-background" />
				<circle cx="46.5" cy="30" r="4" className="fill-fd-background" />
			</g>
		</svg>
	);
}

export function Logo() {
	return (
		<span className="group/logo inline-flex items-center gap-2 font-semibold text-[1.05rem] tracking-[-0.035em]">
			<Mark />
			linkpeek
		</span>
	);
}
