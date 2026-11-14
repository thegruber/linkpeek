"use client";
import { useEffect, useRef } from "react";

// The hero's focal moment. The white rule is </head>: on load the eyes rise
// over it, then glance toward the live demo. Below the rule the page body is
// halftone noise that thins out, the part linkpeek never reads.
//
// After the intro, on devices with a fine pointer, the pupils follow the
// cursor through a damped spring, and the eyes blink now and then. Both stop
// under reduced motion.
const GLANCE = { x: -10, y: 22 };
const REACH = 24;

export function PeekPanel() {
	const panel = useRef<HTMLDivElement>(null);
	const pupils = useRef<SVGGElement>(null);
	const eyes = useRef<SVGGElement>(null);

	useEffect(() => {
		const root = panel.current;
		const group = pupils.current;
		const lids = eyes.current;
		if (!root || !group || !lids) return;
		if (
			matchMedia("(prefers-reduced-motion: reduce)").matches ||
			!matchMedia("(hover: hover) and (pointer: fine)").matches
		) {
			return;
		}

		const current = { ...GLANCE };
		const target = { ...GLANCE };
		let frame = 0;
		let last = 0;
		let tracking = false;

		const step = (time: number) => {
			const dt = Math.min(0.05, (time - (last || time)) / 1000);
			last = time;
			// Critically damped approach: frame-rate independent, no overshoot.
			const k = 1 - Math.exp(-dt * 9);
			current.x += (target.x - current.x) * k;
			current.y += (target.y - current.y) * k;
			group.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
			if (
				Math.abs(target.x - current.x) > 0.05 ||
				Math.abs(target.y - current.y) > 0.05
			) {
				frame = requestAnimationFrame(step);
			} else {
				frame = 0;
				last = 0;
			}
		};

		const onMove = (event: PointerEvent) => {
			if (!tracking) return;
			const box = root.getBoundingClientRect();
			// The midpoint between the eyes sits at (212, 236) of the 400 viewBox.
			const scale = box.width / 400;
			const cx = box.left + 212 * scale;
			const cy = box.top + 236 * scale;
			const dx = event.clientX - cx;
			const dy = event.clientY - cy;
			const distance = Math.hypot(dx, dy) || 1;
			const pull = Math.min(1, distance / 260);
			target.x = (dx / distance) * REACH * pull;
			target.y = Math.max(-REACH, (dy / distance) * REACH * pull);
			if (!frame) frame = requestAnimationFrame(step);
		};

		// Hand over from the CSS glance once it has played.
		const start = setTimeout(() => {
			group.style.animation = "none";
			group.style.transform = `translate(${GLANCE.x}px, ${GLANCE.y}px)`;
			tracking = true;
		}, 1900);

		// A blink every few seconds: the first after the intro, then rarely.
		let blinkTimer = 0;
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

		window.addEventListener("pointermove", onMove, { passive: true });
		return () => {
			clearTimeout(start);
			clearTimeout(blinkTimer);
			cancelAnimationFrame(frame);
			window.removeEventListener("pointermove", onMove);
		};
	}, []);

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
							<g ref={pupils} className="peek-glance">
								<circle cx="166" cy="206" r="25" fill="#0a1a4f" />
								<circle cx="294" cy="206" r="25" fill="#0a1a4f" />
							</g>
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
