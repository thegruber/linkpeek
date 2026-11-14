"use client";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useGaze } from "@/components/gaze";

// The hero's focal moment. The white rule is </head>: on load the eyes rise
// over it, then glance down toward the live demo. Below the rule the page
// body is halftone noise that thins out, the part linkpeek never reads.
//
// After the intro, on fine pointers, the pupils follow the cursor through a
// spring (shared with every pair of eyes on the site) and blink now and
// then. Reduced motion keeps them still at the glance.
const GLANCE = { x: -10, y: 22 };

export function PeekPanel() {
	const panel = useRef<HTMLDivElement>(null);
	const eyes = useRef<SVGGElement>(null);
	const { x, y, look } = useGaze(panel, {
		reach: 24,
		delay: 1900,
		// The midpoint between the eyes sits at (212, 236) of the 400 viewBox.
		origin: (box) => ({
			x: box.left + (212 / 400) * box.width,
			y: box.top + (236 / 400) * box.height,
		}),
	});

	useEffect(() => {
		const glance = setTimeout(() => look(GLANCE), 1300);
		const lids = eyes.current;
		let blinkTimer = 0;
		if (lids && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
			const blink = () => {
				lids.animate(
					[
						{ transform: "scaleY(1)" },
						{ transform: "scaleY(0.08)", offset: 0.45 },
						{ transform: "scaleY(1)" },
					],
					{ duration: 190, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
				);
				blinkTimer = window.setTimeout(blink, 5200 + Math.random() * 4200);
			};
			blinkTimer = window.setTimeout(blink, 3400);
		}
		return () => {
			clearTimeout(glance);
			clearTimeout(blinkTimer);
		};
	}, [look]);

	return (
		<div
			ref={panel}
			className="peek-panel relative aspect-[4/3] w-full overflow-hidden bg-signal text-white lg:aspect-square"
		>
			<svg
				viewBox="0 0 400 400"
				preserveAspectRatio="xMidYMax slice"
				className="absolute inset-0 size-full"
				role="img"
				aria-label="Two eyes peeking over the closing head tag of a page; the body below it fades out unread."
			>
				<defs>
					<pattern
						id="pp-dots"
						width="10"
						height="10"
						patternUnits="userSpaceOnUse"
					>
						<circle cx="5" cy="5" r="2.1" fill="#fff" />
					</pattern>
					<linearGradient id="pp-fade" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#fff" stopOpacity="0.85" />
						<stop offset="0.55" stopColor="#fff" stopOpacity="0.18" />
						<stop offset="1" stopColor="#fff" stopOpacity="0" />
					</linearGradient>
					<mask id="pp-body">
						<rect x="0" y="262" width="400" height="138" fill="url(#pp-fade)" />
					</mask>
					<clipPath id="pp-above">
						<rect x="0" y="0" width="400" height="250" />
					</clipPath>
				</defs>

				<rect
					className="peek-body"
					x="0"
					y="262"
					width="400"
					height="138"
					fill="url(#pp-dots)"
					mask="url(#pp-body)"
				/>

				<g clipPath="url(#pp-above)">
					<g className="peek-rise">
						<g ref={eyes} className="peek-eyes">
							<circle cx="148" cy="236" r="62" fill="#fff" />
							<circle cx="276" cy="236" r="62" fill="#fff" />
							<motion.g style={{ x, y }}>
								<circle cx="166" cy="206" r="25" fill="#0a1a4f" />
								<circle cx="294" cy="206" r="25" fill="#0a1a4f" />
							</motion.g>
						</g>
					</g>
				</g>

				<rect x="0" y="250" width="400" height="12" fill="#fff" />
				<rect x="14" y="272" width="84" height="26" className="fill-signal" />
				<text
					x="24"
					y="290"
					fill="#fff"
					fontFamily="var(--font-geist-mono), monospace"
					fontSize="15"
					opacity="0.9"
				>
					&lt;/head&gt;
				</text>
				<text
					x="376"
					y="384"
					textAnchor="end"
					fill="#fff"
					fontFamily="var(--font-geist-mono), monospace"
					fontSize="13"
					opacity="0.75"
				>
					body · not read
				</text>
			</svg>
		</div>
	);
}
