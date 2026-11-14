import mark from "@/lib/mark.json";

// The linkpeek mark: two eyes peeking over an edge. The mint band is the
// page's <head>, the only part linkpeek reads.
export function Mark({ className = "size-6" }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
			<rect width="64" height="64" fill="#232323" />
			<rect y={mark.band} width="64" height={64 - mark.band} fill="#3ddc84" />
			<path d={mark.eyes} fill="#ffffff" />
			<g className="peek-pupils">
				{mark.pupils.map((pupil) => (
					<circle
						key={pupil.cx}
						cx={pupil.cx}
						cy={pupil.cy}
						r={pupil.r}
						fill="#232323"
					/>
				))}
			</g>
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
