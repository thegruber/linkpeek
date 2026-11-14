"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";

// A horizontal strip the reader moves themselves: native scroll and swipe
// with snap points, plus arrow buttons for mouse and keyboard users.
export function ShowcaseStrip({
	title,
	children,
}: {
	title: ReactNode;
	children: ReactNode;
}) {
	const list = useRef<HTMLUListElement>(null);
	const [edges, setEdges] = useState({ start: true, end: false });

	useEffect(() => {
		const element = list.current;
		if (!element) return;
		const update = () =>
			setEdges({
				start: element.scrollLeft < 4,
				end:
					element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
			});
		update();
		element.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			element.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	const move = (direction: 1 | -1) => {
		const element = list.current;
		if (!element) return;
		const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
		element.scrollBy({
			left: direction * element.clientWidth * 0.8,
			behavior: reduce ? "auto" : "smooth",
		});
	};

	const button =
		"press grid size-11 place-items-center border-ink border-l transition-[background-color,color,opacity,transform] hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30";

	return (
		<>
			<div className="flex items-stretch justify-between border-ink border-b">
				<div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-4 sm:px-8">
					{title}
				</div>
				<div className="flex">
					<button
						type="button"
						aria-label="Previous previews"
						disabled={edges.start}
						onClick={() => move(-1)}
						className={button}
					>
						<svg
							viewBox="0 0 16 16"
							aria-hidden="true"
							className="size-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M13 8H3M7 4 3 8l4 4" />
						</svg>
					</button>
					<button
						type="button"
						aria-label="Next previews"
						disabled={edges.end}
						onClick={() => move(1)}
						className={button}
					>
						<svg
							viewBox="0 0 16 16"
							aria-hidden="true"
							className="size-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M3 8h10M9 4l4 4-4 4" />
						</svg>
					</button>
				</div>
			</div>
			<ul
				ref={list}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region must be reachable by keyboard
				tabIndex={0}
				aria-label="Captured link previews"
				className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-2px] [&::-webkit-scrollbar]:hidden"
			>
				{children}
			</ul>
		</>
	);
}
