"use client";
import { useEffect, useRef } from "react";
import mark from "@/lib/mark.json";

// Ordered (Bayer 4x4) dither of a still field, with the linkpeek
// mark drawn huge and flat on top, cropped by the cell like a poster. The
// pupil of the giant eye follows the pointer. It redraws only on pointer
// movement, never while off screen, and stays still under reduced motion.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CELL = 3;
const INK = [35, 35, 35];
const SHAPE = "#d9d9d9";
const BAND = "#ff5b1f";

export function Dither({
	className,
	/** Mark position and scale relative to the cell height. */
	place = { x: 0.5, width: 0.62 },
	showMark = true,
	tone = 0,
}: {
	className?: string;
	/**
	 * Where the eyes sit on the orange band along the bottom edge: `x` is the
	 * horizontal centre (0 to 1), `width` the span of both eyes relative to
	 * the cell width.
	 */
	place?: { x: number; width: number };
	showMark?: boolean;
	/** Shifts the field darker (positive) or lighter (negative). */
	tone?: number;
}) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;
		const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const finePointer = matchMedia(
			"(hover: hover) and (pointer: fine)",
		).matches;
		const eyes = new Path2D(mark.eyes);
		const small = document.createElement("canvas");
		const smallContext = small.getContext("2d");
		if (!smallContext) return;

		let width = 0;
		let height = 0;
		let image: ImageData | null = null;
		let frame = 0;
		let visible = true;
		const pupil = { x: 0, y: 2.5 };
		const target = { x: 0, y: 2.5 };
		const pointer = { x: -9999, y: -9999 };

		// Eyes span x 8..56 of the 64-unit mark and sit on y = mark.band.
		const layout = () => {
			const band = Math.max(10, Math.round(height * 0.12));
			const s = Math.min((width * place.width) / 48, (height * 0.62) / 24);
			const tx = width * place.x - 32 * s;
			const ty = height - band - mark.band * s;
			return { s, tx, ty, band };
		};

		const resize = () => {
			const box = canvas.getBoundingClientRect();
			const ratio = Math.min(2, devicePixelRatio || 1);
			width = Math.max(1, Math.round(box.width));
			height = Math.max(1, Math.round(box.height));
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			small.width = Math.ceil(width / CELL);
			small.height = Math.ceil(height / CELL);
			image = smallContext.createImageData(small.width, small.height);
		};

		const draw = (time: number) => {
			if (!image) return;
			const t = time / 1000;
			const { data } = image;
			const w = small.width;
			const h = small.height;
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const px = x * CELL;
					const py = y * CELL;
					const dx = px - pointer.x;
					const dy = py - pointer.y;
					const value =
						0.5 +
						tone +
						0.24 *
							Math.sin(
								px * 0.009 + t * 0.18 + Math.cos(py * 0.008 - t * 0.12),
							) +
						0.18 * Math.sin((px + py) * 0.014 - t * 0.22) -
						0.3 * (py / height) +
						0.28 * Math.exp(-(dx * dx + dy * dy) / 26000);
					const threshold = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
					const index = (y * w + x) * 4;
					const on = value > threshold;
					data[index] = on ? INK[0] : 255;
					data[index + 1] = on ? INK[1] : 255;
					data[index + 2] = on ? INK[2] : 255;
					data[index + 3] = 255;
				}
			}
			smallContext.putImageData(image, 0, 0);
			context.imageSmoothingEnabled = false;
			context.drawImage(small, 0, 0, w * CELL, h * CELL);

			if (showMark) {
				const { s, tx, ty, band } = layout();
				// The band: the page's <head>, the edge the eyes peek over.
				context.fillStyle = BAND;
				context.fillRect(0, height - band, width, band);
				context.save();
				context.translate(tx, ty);
				context.scale(s, s);
				context.fillStyle = SHAPE;
				context.fill(eyes);
				// Pupils, clipped to the eyes, looking toward the pointer.
				context.save();
				context.clip(eyes);
				context.fillStyle = `rgb(${INK.join(",")})`;
				for (const p of mark.pupils) {
					context.beginPath();
					context.arc(p.cx + pupil.x, p.cy + pupil.y, p.r, 0, Math.PI * 2);
					context.fill();
				}
				context.restore();
				context.restore();
			}
		};

		// No idle animation: the field redraws only while the pointer moves
		// or the pupils are still settling, so an idle page costs nothing.
		let clientX = -9999;
		let clientY = -9999;
		const tick = () => {
			frame = 0;
			if (!visible) return;
			const box = canvas.getBoundingClientRect();
			pointer.x = clientX - box.left;
			pointer.y = clientY - box.top;
			const { s, tx, ty } = layout();
			const dx = pointer.x - (tx + 32 * s);
			const dy = pointer.y - (ty + 38 * s);
			const distance = Math.hypot(dx, dy) || 1;
			const pull = Math.min(1, distance / 400);
			target.x = (dx / distance) * 5.5 * pull;
			target.y = Math.min(3, 2.5 + (dy / distance) * 4 * pull);
			pupil.x += (target.x - pupil.x) * 0.22;
			pupil.y += (target.y - pupil.y) * 0.22;
			draw(0);
			if (Math.abs(target.x - pupil.x) + Math.abs(target.y - pupil.y) > 0.05) {
				frame = requestAnimationFrame(tick);
			}
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(tick);
		};
		const onMove = (event: PointerEvent) => {
			clientX = event.clientX;
			clientY = event.clientY;
			schedule();
		};

		resize();
		draw(0);
		const resizeObserver = new ResizeObserver(() => {
			resize();
			draw(0);
		});
		resizeObserver.observe(canvas);
		if (still) return () => resizeObserver.disconnect();

		const visibility = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
		});
		visibility.observe(canvas);
		if (finePointer)
			window.addEventListener("pointermove", onMove, { passive: true });
		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			visibility.disconnect();
			window.removeEventListener("pointermove", onMove);
		};
	}, [place.x, place.width, showMark, tone]);

	return (
		<div aria-hidden="true" className={`size-full ${className ?? ""}`}>
			<canvas ref={ref} className="block size-full" />
		</div>
	);
}
