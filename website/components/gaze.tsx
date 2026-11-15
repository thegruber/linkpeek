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
		hold,
	}: {
		reach: number;
		origin: (box: DOMRect) => Point;
		rest?: Point;
		/** Lowest y offset, so pupils never sink below the edge they peek over. */
		floor?: number;
		delay?: number;
		/** While true, the pointer is ignored (the caller moves the pupils). */
		hold?: RefObject<boolean>;
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
			if (!active || !element || hold?.current) return;
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
	}, [reduce, delay, ref, tx, ty, hold]);

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
 * The brand's eyes peeking over whatever edge they sit on. Place them so
 * their flat bottom touches the edge.
 */
export function PeekingEyes({
	className,
	style,
	sclera = "#ffffff",
	pupil = "#0b0b0c",
	outline,
	scanning = false,
}: {
	className?: string;
	style?: React.CSSProperties;
	sclera?: string;
	pupil?: string;
	outline?: string;
	/** Pupils read left to right, like scanning a line, until it turns false. */
	scanning?: boolean;
}) {
	const ref = useRef<SVGSVGElement>(null);
	const hold = useRef(false);
	const reduce = useReducedMotion();
	const { x, y, look } = useGaze(ref, {
		reach: 4.2,
		floor: 1.5,
		hold,
		origin: (box) => ({ x: box.left + box.width / 2, y: box.bottom }),
	});
	const lookRef = useRef(look);
	lookRef.current = look;
	useEffect(() => {
		if (!scanning || reduce) return;
		hold.current = true;
		let step = 0;
		const read = () => {
			lookRef.current({ x: step % 2 ? 3.6 : -3.6, y: -1.5 });
			step++;
		};
		read();
		const timer = setInterval(read, 380);
		return () => {
			clearInterval(timer);
			hold.current = false;
			lookRef.current({ x: 0, y: 0 });
		};
	}, [scanning, reduce]);
	return (
		<svg
			ref={ref}
			viewBox="0 0 48 24"
			aria-hidden="true"
			className={className}
			style={style}
		>
			<path
				d="M1.5 24a10.5 10.5 0 0 1 21 0zM25.5 24a10.5 10.5 0 0 1 21 0z"
				fill={sclera}
				stroke={outline}
				strokeWidth={outline ? 2 : 0}
			/>
			<motion.g style={{ x, y }}>
				<circle cx="15" cy="17.5" r="4" fill={pupil} />
				<circle cx="39" cy="17.5" r="4" fill={pupil} />
			</motion.g>
		</svg>
	);
}
