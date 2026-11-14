"use client";
import {
	type MotionValue,
	motion,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from "motion/react";
import type React from "react";
import { type RefObject, useEffect, useRef } from "react";

interface Point {
	x: number;
	y: number;
}

const SPRING = { stiffness: 150, damping: 19, mass: 0.6 };

/**
 * Pupils that follow the pointer through a spring. Only on fine pointers and
 * without reduced motion; elsewhere they stay at `rest`. Off-screen eyes
 * ignore the pointer so only the visible ones react.
 */
export function useGaze(
	ref: RefObject<Element | null>,
	{
		reach,
		origin,
		rest = { x: 0, y: 0 },
		floor = Number.POSITIVE_INFINITY,
		delay = 0,
	}: {
		reach: number;
		origin: (box: DOMRect) => Point;
		rest?: Point;
		/** Lowest y offset, so pupils never sink below the edge they peek over. */
		floor?: number;
		delay?: number;
	},
): {
	x: MotionValue<number>;
	y: MotionValue<number>;
	look: (p: Point) => void;
} {
	const tx = useMotionValue(rest.x);
	const ty = useMotionValue(rest.y);
	const x = useSpring(tx, SPRING);
	const y = useSpring(ty, SPRING);
	const reduce = useReducedMotion();
	const options = useRef({ reach, origin, floor });
	options.current = { reach, origin, floor };

	useEffect(() => {
		if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) {
			return;
		}
		let active = delay === 0;
		const timer = delay ? setTimeout(() => (active = true), delay) : undefined;
		const onMove = (event: PointerEvent) => {
			const element = ref.current;
			if (!active || !element) return;
			const box = element.getBoundingClientRect();
			if (box.bottom < 0 || box.top > innerHeight) return;
			const { reach: r, origin: o, floor: f } = options.current;
			const center = o(box);
			const dx = event.clientX - center.x;
			const dy = event.clientY - center.y;
			const distance = Math.hypot(dx, dy) || 1;
			const pull = Math.min(1, distance / 260);
			tx.set((dx / distance) * r * pull);
			ty.set(Math.min(f, (dy / distance) * r * pull));
		};
		window.addEventListener("pointermove", onMove, { passive: true });
		return () => {
			clearTimeout(timer);
			window.removeEventListener("pointermove", onMove);
		};
	}, [reduce, delay, ref, tx, ty]);

	return {
		x,
		y,
		look: (point) => {
			tx.set(point.x);
			ty.set(point.y);
		},
	};
}

/**
 * The brand's eye peeking over whatever edge it sits on. Place them so
 * their flat bottom touches the edge.
 */
export function PeekingEyes({
	className,
	style,
	sclera = "#9fd8f7",
	pupil = "#0b0b0c",
	outline,
}: {
	className?: string;
	style?: React.CSSProperties;
	sclera?: string;
	pupil?: string;
	outline?: string;
}) {
	const ref = useRef<SVGSVGElement>(null);
	const { x, y } = useGaze(ref, {
		reach: 4.2,
		floor: 1.5,
		origin: (box) => ({ x: box.left + box.width / 2, y: box.bottom }),
	});
	return (
		<svg
			ref={ref}
			viewBox="0 0 48 24"
			aria-hidden="true"
			className={className}
			style={style}
		>
			<path
				d="M11 24a13 13 0 0 1 26 0z"
				fill={sclera}
				stroke={outline}
				strokeWidth={outline ? 1.5 : 0}
			/>
			<motion.g style={{ x, y }}>
				<circle cx="27.5" cy="17.5" r="4.6" fill={pupil} />
			</motion.g>
		</svg>
	);
}
