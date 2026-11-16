"use client";
import { motion } from "motion/react";
import { useId, useRef } from "react";
import { useGaze } from "@/components/gaze";
import mark from "@/lib/mark.json";

// The linkpeek mark: two eyes peeking over an edge. The orange band is the
// page's <head>, the only part linkpeek reads. The pupils follow the pointer
// (fine pointers only, never with reduced motion) and are clipped to the eyes.
export function Mark({ className = "size-6" }: { className?: string }) {
	const ref = useRef<SVGSVGElement>(null);
	const clip = useId();
	const { x, y } = useGaze(ref, {
		reach: 3.4,
		floor: 1.8,
		origin: (box) => ({
			x: box.left + box.width / 2,
			y: box.top + (box.height * mark.band) / 64,
		}),
	});
	return (
		<svg ref={ref} viewBox="0 0 64 64" aria-hidden="true" className={className}>
			<defs>
				<clipPath id={clip}>
					<path d={mark.eyes} />
				</clipPath>
			</defs>
			<rect width="64" height="64" fill="#232323" />
			<rect y={mark.band} width="64" height={64 - mark.band} fill="#ff5b1f" />
			<path d={mark.eyes} fill="#ffffff" />
			<g clipPath={`url(#${clip})`}>
				<g className="peek-pupils">
					<motion.g style={{ x, y }}>
						{mark.pupils.map((pupil) => (
							<circle
								key={pupil.cx}
								cx={pupil.cx}
								cy={pupil.cy}
								r={pupil.r}
								fill="#232323"
							/>
						))}
					</motion.g>
				</g>
			</g>
		</svg>
	);
}

export function Logo() {
	return (
		<span className="group/logo inline-flex items-center gap-2 font-medium text-[1.05rem] tracking-[-0.045em]">
			<Mark />
			<span>linkpeek</span>
		</span>
	);
}
