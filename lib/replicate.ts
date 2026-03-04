import Replicate from "replicate";

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("Missing REPLICATE_API_TOKEN environment variable");
}

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// SDXL Lightning 4-step — fast, high quality
export const SDXL_LIGHTNING_MODEL =
  "bytedance/sdxl-lightning-4step:6f7a773af6fc3e8de9d5a3c00be77c17308914bf67772726aff83496ba1e3bbe" as const;
