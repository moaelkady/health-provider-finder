/// <reference lib="webworker" />

import {
  prepareProvidersFromJson,
  type PrepareSource,
} from "@/data/prepare-providers";
import type { Provider } from "@/types/provider";

export type PrepareWorkerRequest =
  | { type: "prepare"; url: string; source: PrepareSource }
  | { type: "prepare-text"; text: string; source: PrepareSource };

export type PrepareWorkerResponse =
  | { type: "ready"; providers: Provider[] }
  | { type: "error"; message: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", async (event: MessageEvent<PrepareWorkerRequest>) => {
  const data = event.data;
  if (!data) return;

  try {
    let text: string;
    let source: PrepareSource;

    if (data.type === "prepare") {
      const response = await fetch(data.url);
      if (!response.ok) {
        throw new Error(`Failed to load providers (${response.status})`);
      }
      text = await response.text();
      source = data.source;
    } else if (data.type === "prepare-text") {
      text = data.text;
      source = data.source;
    } else {
      return;
    }

    const providers = prepareProvidersFromJson(text, source);
    const message: PrepareWorkerResponse = { type: "ready", providers };
    ctx.postMessage(message);
  } catch (error) {
    const message: PrepareWorkerResponse = {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to prepare providers",
    };
    ctx.postMessage(message);
  }
});
