"use client";
import NumberFlow from "@number-flow/react";
import { type RefObject, useEffect, useRef, useState } from "react";

// Both components render their final state on the server and without
// JavaScript. Only content that starts below the fold is armed to animate
// when it scrolls into view, and reduced motion skips that entirely.
function useArmed(ref: RefObject<Element | null>) {
	// Browser built-ins instead of the motion library, so pages that only show
	// a rolling figure (every docs page has one in the header) stay light.
	const [armed, setArmed] = useState(false);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const element = ref.current;
		if (
			!element ||
			matchMedia("(prefers-reduced-motion: reduce)").matches ||
			element.getBoundingClientRect().top <= innerHeight * 0.9
		) {
			return;
		}
		setArmed(true);
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "0px 0px -12% 0px" },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);
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
				spinTiming={{ duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}
				transformTiming={{
					duration: 250,
					easing: "cubic-bezier(0.23, 1, 0.32, 1)",
				}}
			/>
		</span>
	);
}
