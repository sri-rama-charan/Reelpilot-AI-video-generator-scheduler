import { Inngest } from "inngest";

const eventKey =
	process.env.INNGEST_EVENT_KEY ?? process.env.INNGEST_API_KEY ?? undefined;
const signingKey = process.env.INNGEST_SIGNING_KEY?.trim();

export const inngest = new Inngest({
	id: "vidgen",
	eventKey,
	signingKey,
});
