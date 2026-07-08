import type { ModelInfo } from "../catalog/types";

/**
 * The ChatGPT/Codex backend starts rejecting requests around 95% of a
 * model's advertised input cap, so every model exposed through this
 * provider gets its maxInputTokens scaled down to the effective budget.
 *
 * REF: https://github.com/openai/codex/issues/19319
 */
export const CODEX_EFFECTIVE_CONTEXT_WINDOW_PERCENT = 0.95;

const GPT_VERSION_REGEX = /^gpt-(\d+\.\d+)/;

/**
 * ChatGPT/Codex subscription sessions are not the same surface as the OpenAI
 * API. Even when the equivalent OpenAI API model advertises a larger context
 * window, Codex subscription requests are capped to the ChatGPT/Codex product
 * context budget.
 */
export const CODEX_SUBSCRIPTION_CONTEXT_WINDOW = 128_000;

const OPENAI_API_CODEX_MODEL_LIMITS: Record<
	string,
	{ contextWindow: number; maxTokens: number }
> = {
	// OpenAI API docs list GPT-5-Codex / GPT-5.1-Codex as 400K context,
	// 128K max output. These are API limits, not ChatGPT subscription limits.
	"gpt-5-codex": { contextWindow: 400_000, maxTokens: 128_000 },
	"gpt-5.1-codex": { contextWindow: 400_000, maxTokens: 128_000 },
};

function getOpenAIApiCodexModelLimits(
	id: string,
): { contextWindow: number; maxTokens: number } | undefined {
	return OPENAI_API_CODEX_MODEL_LIMITS[id];
}

function isOpenAICodexAllowedModel(id: string, model: ModelInfo): boolean {
	// O, pro, and nano variants are not supported
	const family = model.family;
	if (
		family &&
		(family.startsWith("o") ||
			family.includes("pro") ||
			family.includes("nano"))
	) {
		return false;
	}
	// Must be newer than 5.3
	const match = id.match(GPT_VERSION_REGEX);
	return match ? Number.parseFloat(match[1]) > 5.3 : false;
}

/**
 * Applies the effective input budget to every allowed model. The source catalog
 * represents OpenAI API model limits; this provider represents ChatGPT/Codex
 * subscription access, so the requestable input budget is clamped to the
 * subscription context cap even when the API model has a larger window.
 */
function toOpenAICodexModel(id: string, model: ModelInfo): ModelInfo {
	const apiCodexLimits = getOpenAIApiCodexModelLimits(id);
	const contextWindow = Math.min(
		model.contextWindow ?? CODEX_SUBSCRIPTION_CONTEXT_WINDOW,
		CODEX_SUBSCRIPTION_CONTEXT_WINDOW,
	);
	const sourceMaxInputTokens = model.maxInputTokens ?? contextWindow;
	const maxInputTokens =
		Math.min(sourceMaxInputTokens, contextWindow) *
		CODEX_EFFECTIVE_CONTEXT_WINDOW_PERCENT;

	return {
		...model,
		contextWindow,
		maxInputTokens,
		maxTokens: apiCodexLimits?.maxTokens ?? model.maxTokens,
	};
}

export function filterOpenAICodexModels(
	models: Record<string, ModelInfo>,
): Record<string, ModelInfo> {
	const result: Record<string, ModelInfo> = {};
	for (const [id, model] of Object.entries(models)) {
		if (isOpenAICodexAllowedModel(id, model)) {
			result[id] = toOpenAICodexModel(id, model);
		}
	}
	return result;
}
