"use client";
import { type ReactNode, useEffect, useRef } from "react";

const SPEED = 24; // px per second: slow enough to read while it moves
const RESUME_MS = 2500;

// A strip of cards that drifts slowly on its own and loops, and that the
// reader can scroll, swipe or wheel at any time. Hover, touch, focus or a
// scroll pauses the drift; it resumes a moment after the reader lets go.
// Under reduced motion it stays still and is a plain scroll region.
export function ShowcaseStrip({
	title,
	children,
}: {
	title: ReactNode;
	children: ReactNode;
}) {
	const scroller = useRef<HTMLElement>(null);
	const first = useRef<HTMLUListElement>(null);

	useEffect(() => {
		const element = scroller.current;
		const list = first.current;
		if (!element || !list) return;
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let pos = element.scrollLeft;
		let last = 0;
		let frame = 0;
		let visible = false;
		let hovering = false;
		let heldUntil = 0;

		const hold = () => {
			heldUntil = performance.now() + RESUME_MS;
		};
		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			const dt = last ? Math.min(64, now - last) : 0;
			last = now;
			if (hovering || now < heldUntil || document.hidden) {
				pos = element.scrollLeft;
				return;
			}
			pos += (SPEED * dt) / 1000;
			// The second copy follows the first, so jumping back by one list
			// width is invisible and the strip loops without an end.
			const loop = list.offsetWidth;
			if (loop > 0 && pos >= loop) pos -= loop;
			element.scrollLeft = pos;
		};
		const start = () => {
			if (!frame) {
				last = 0;
				frame = requestAnimationFrame(tick);
			}
		};
		const stop = () => {
			cancelAnimationFrame(frame);
			frame = 0;
		};
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) start();
			else stop();
		});
		observer.observe(element);

		const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
		const enter = () => {
			if (fine) hovering = true;
		};
		const leave = () => {
			hovering = false;
			hold();
		};
		element.addEventListener("pointerenter", enter);
		element.addEventListener("pointerleave", leave);
		element.addEventListener("pointerdown", hold, { passive: true });
		element.addEventListener("touchstart", hold, { passive: true });
		element.addEventListener("wheel", hold, { passive: true });
		element.addEventListener("focusin", hold);
		element.addEventListener("keydown", hold);
		return () => {
			stop();
			observer.disconnect();
			element.removeEventListener("pointerenter", enter);
			element.removeEventListener("pointerleave", leave);
			element.removeEventListener("pointerdown", hold);
			element.removeEventListener("touchstart", hold);
			element.removeEventListener("wheel", hold);
			element.removeEventListener("focusin", hold);
			element.removeEventListener("keydown", hold);
		};
	}, []);

	return (
		<>
			<div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-ink border-b px-5 py-4 sm:px-8">
				{title}
			</div>
			<section
				ref={scroller}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region must be reachable by keyboard
				tabIndex={0}
				aria-label="Captured link previews"
				className="flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-2px] [&::-webkit-scrollbar]:hidden"
			>
				<ul ref={first} className="flex shrink-0">
					{children}
				</ul>
				{/* The loop's second copy: hidden from assistive tech and the tab order. */}
				<ul className="flex shrink-0" aria-hidden="true" inert>
					{children}
				</ul>
			</section>
		</>
	);
}
