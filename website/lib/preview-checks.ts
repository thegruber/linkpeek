/** The fields a preview needs to render well on Slack, X, iMessage and LinkedIn. */
export interface CheckInput {
	title: string | null;
	description: string | null;
	image: string | null;
	imageAlt: string | null;
	twitterCard: string | null;
	favicon: string | null;
}

export interface Check {
	label: string;
	ok: boolean;
}

/** Plain presence checks on linkpeek's result; no weighting, no guesswork. */
export function previewChecks(card: CheckInput): Check[] {
	return [
		{ label: "title", ok: Boolean(card.title) },
		{ label: "description", ok: Boolean(card.description) },
		{ label: "image", ok: Boolean(card.image) },
		{ label: "image alt", ok: Boolean(card.imageAlt) },
		{ label: "twitter:card", ok: Boolean(card.twitterCard) },
		{ label: "favicon", ok: Boolean(card.favicon) },
	];
}
