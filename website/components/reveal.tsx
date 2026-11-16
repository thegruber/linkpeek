"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";

// Marks its child chart visible once it scrolls into view, so the bars grow
// when the reader reaches the data. Without JavaScript the bars are drawn.
export function Reveal({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState<"unset" | "false" | "true">("unset");
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		setVisible("false");
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisible("true");
					observer.disconnect();
				}
			},
			{ threshold: 0.35 },
		);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	return (
		<div
			ref={ref}
			className={`bars ${className ?? ""}`}
			data-visible={visible === "unset" ? undefined : visible}
		>
			{children}
		</div>
	);
}
