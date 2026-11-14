// The linkpeek mark: a link preview card, tilted as if just pasted, with two
// eyes peeking over its top edge and looking down at it.
// Colors come from CSS tokens so the mark follows the site palette.
const TILE = "var(--color-logo-tile)";
const LINE = "var(--color-logo-line)";
const NAVY = "#0b0b0c";
const SOFT = "var(--color-logo-thumb)";

export function Mark({ className = "size-6" }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
			<rect width="64" height="64" fill={TILE} />
			<g transform="translate(0 -2) rotate(-8 32 40)">
				<circle cx="35" cy="26" r="7.5" fill="#fff" />
				<circle cx="50.5" cy="26" r="7.5" fill="#fff" />
				<g className="peek-pupils">
					<circle cx="33.4" cy="28.2" r="3.2" fill={NAVY} />
					<circle cx="48.9" cy="28.2" r="3.2" fill={NAVY} />
				</g>
				<rect
					x="7"
					y="29.5"
					width="50"
					height="26"
					rx="1.5"
					fill="#fff"
					stroke={TILE}
					strokeWidth="3"
				/>
				<rect x="12.5" y="35" width="12" height="15" fill={SOFT} />
				<rect x="28.5" y="36.5" width="21" height="4" fill={LINE} />
				<rect x="28.5" y="44" width="13" height="3.5" fill={SOFT} />
			</g>
		</svg>
	);
}

export function Logo() {
	return (
		<span className="group/logo inline-flex items-center gap-2 font-semibold text-[1.05rem] tracking-[-0.045em]">
			<Mark />
			linkpeek
		</span>
	);
}
