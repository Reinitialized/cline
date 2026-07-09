import { CLAUDE_SONNET_1M_SUFFIX, type ModelInfo } from "@shared/api"
import { isGeminiFlashModel, GEMINI_FLASH_MAX_OUTPUT_TOKENS } from "@/utils/model-utils"
import {
	isClaudeOpusAdaptiveThinkingModel,
	resolveClaudeOpusAdaptiveThinking,
	supportsReasoningEffortForModel,
} from "@shared/utils/reasoning-support"

interface OpenRouterClientLike {
	chat: {
		completions: {
			create: (payload: Record<string, unknown>) => Promise<unknown>
		}
	}
}

interface OpenRouterModelSelection {
	id: string
	info: ModelInfo
}

function toTextContent(text: string) {
	return [{ type: "text", text, cache_control: { type: "ephemeral" } }]
}

function shouldApplyExplicitPromptCache(modelId: string): boolean {
	const id = modelId.toLowerCase()
	return id.includes("qwen3.6") || id.includes("qwen3.7")
}

function normalizeModelId(modelId: string): { model: string; provider?: Record<string, unknown> } {
	if (modelId.endsWith(CLAUDE_SONNET_1M_SUFFIX)) {
		return {
			model: modelId.slice(0, -CLAUDE_SONNET_1M_SUFFIX.length),
			provider: { order: ["anthropic", "google-vertex/global"], allow_fallbacks: false },
		}
	}

	return { model: modelId }
}

export async function createOpenRouterStream(
	client: OpenRouterClientLike,
	systemPrompt: string,
	messages: unknown[],
	model: OpenRouterModelSelection,
	reasoningEffort?: string,
	thinkingBudgetTokens?: number,
) {
	const normalized = normalizeModelId(model.id)
	const payload: Record<string, unknown> = {
		model: normalized.model,
		messages: [{ role: "system", content: systemPrompt }, ...messages],
	}

	if (normalized.provider) {
		payload.provider = normalized.provider
	}

	if (isGeminiFlashModel(model.id)) {
		payload.max_tokens = Math.min(model.info.maxTokens ?? GEMINI_FLASH_MAX_OUTPUT_TOKENS, GEMINI_FLASH_MAX_OUTPUT_TOKENS)
	}

	if (shouldApplyExplicitPromptCache(model.id)) {
		payload.messages = [{ role: "system", content: toTextContent(systemPrompt) }, ...messages].map((message) => {
			if (typeof message === "object" && message !== null && "content" in message) {
				const content = (message as { content?: unknown }).content
				if (typeof content === "string") {
					return { ...message, content: toTextContent(content) }
				}
			}
			return message
		})
	}

	if (reasoningEffort && isClaudeOpusAdaptiveThinkingModel(model.id)) {
		const adaptive = resolveClaudeOpusAdaptiveThinking(reasoningEffort, thinkingBudgetTokens)
		if (adaptive.enabled) {
			payload.reasoning = { enabled: true }
			payload.verbosity = adaptive.effort
		}
	} else if (reasoningEffort && supportsReasoningEffortForModel(model.id)) {
		payload.include_reasoning = true
		payload.reasoning = { effort: reasoningEffort }
	} else if (thinkingBudgetTokens && thinkingBudgetTokens > 0) {
		payload.include_reasoning = true
		payload.reasoning = { max_tokens: thinkingBudgetTokens }
	} else if (model.id.startsWith("cline-pass/")) {
		payload.include_reasoning = true
	}

	return client.chat.completions.create(payload)
}