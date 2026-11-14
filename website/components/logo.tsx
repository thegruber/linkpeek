import mark from "@/lib/mark.json";

// The linkpeek mark: an HTML angle bracket and an eye peeking over a hidden
// line, read as "<peek". The same geometry drives the giant dithered art.
export function Mark({ className = "size-6" }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
			<rect width="64" height="64" fill="#232323" />
			<path
				d={mark.bracket}
				fill="none"
				stroke="#ffffff"
				strokeWidth="6.5"
				strokeLinecap="square"
			/>
			<path d={mark.eye} fill="#9fd8f7" />
			<circle
				className="peek-pupils"
				cx={mark.pupil.cx}
				cy={mark.pupil.cy}
				r={mark.pupil.r}
				fill="#232323"
			/>
		</svg>
	);
}

export function Logo() {
	return (
		<span className="group/logo inline-flex items-center gap-2 font-medium text-[1.05rem] tracking-[-0.045em]">
			<Mark />
			linkpeek
		</span>
	);
}
