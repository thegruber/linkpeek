"use client";
import NumberFlow from "@number-flow/react";
import { useInView, useReducedMotion } from "motion/react";
import {
	type CSSProperties,
	createElement,
	type ElementType,
	useEffect,
	useRef,
	useState,
} from "react";

// Both components render their final state on the server and without
// JavaScript. Only content that starts below the fold is armed to animate
// when it scrolls into view, and reduced motion skips that entirely.
function useArmed(ref: React.RefObject<Element | null>) {
	const reduce = useReducedMotion();
	const [armed, setArmed] = useState(false);
	useEffect(() => {
		const element = ref.current;
		if (
			!reduce &&
			element &&
			element.getBoundingClientRect().top > innerHeight * 0.9
		) {
			setArmed(true);
		}
	}, [reduce, ref]);
	const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
	return { armed, inView };
}

/** A figure whose digits roll up from zero the first time it is seen. */
export function RollingFigure({
	value,
	decimals = 0,
	suffix = "",
	className,
}: {
	value: number;
	decimals?: number;
	suffix?: string;
	className?: string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	const { armed, inView } = useArmed(ref);
	return (
		<span ref={ref} className={className}>
			<NumberFlow
				value={armed && !inView ? 0 : value}
				suffix={suffix}
				format={{
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				}}
				spinTiming={{ duration: 900, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
				transformTiming={{
					duration: 700,
					easing: "cubic-bezier(0.23, 1, 0.32, 1)",
				}}
				willChange
			/>
		</span>
	);
}

/** A heading whose words rise out of their own masks, once, in reading order. */
export function WordReveal({
	text,
	as = "h2",
	className,
	id,
}: {
	text: string;
	as?: ElementType;
	className?: string;
	id?: string;
}) {
	const ref = useRef<HTMLElement>(null);
	const { armed, inView } = useArmed(ref);
	const state = !armed ? undefined : inView ? "in" : "pending";
	const words = text.split(" ");
	return createElement(
		as,
		{ ref, id, className, "data-reveal": state },
		words.flatMap((word, index) => [
			// biome-ignore lint/suspicious/noArrayIndexKey: the words of a fixed heading never reorder
			<span key={`${word}-${index}`} className="reveal-word">
				<span style={{ "--i": index } as CSSProperties}>{word}</span>
			</span>,
			index < words.length - 1 ? " " : null,
		]),
	);
}
