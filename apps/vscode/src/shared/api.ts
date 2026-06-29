import { ApiFormat } from "./proto/cline/models"
import type { ApiHandlerSettings } from "./storage/state-keys"

export type ApiProvider =
	| "anthropic"
	| "claude-code"
	| "openrouter"
	| "bedrock"
	| "vertex"
	| "openai"
	| "ollama"
	| "lmstudio"
	| "gemini"
	| "openai-native"
	| "openai-codex"
	| "requesty"
	| "together"
	| "deepseek"
	| "qwen"
	| "qwen-code"
	| "doubao"
	| "mistral"
	| "vscode-lm"
	| "cline"
	| "cline-pass"
	| "litellm"
	| "moonshot"
	| "nebius"
	| "fireworks"
	| "asksage"
	| "xai"
	| "sambanova"
	| "cerebras"
	| "sapaicore"
	| "groq"
	| "poolside"
	| "huggingface"
	| "huawei-cloud-maas"
	| "dify"
	| "baseten"
	| "vercel-ai-gateway"
	| "v0"
	| "zai"
	| "zai-coding-plan"
	| "oca"
	| "aihubmix"
	| "minimax"
	| "hicap"
	| "nousResearch"
	| "wandb"
	| "xiaomi"
	| "tencent-tokenhub"

export const DEFAULT_API_PROVIDER = "openrouter" as ApiProvider

export interface ApiHandlerOptions extends Partial<ApiHandlerSettings> {
	ulid?: string // Used to identify the task in API requests
	onRetryAttempt?: (attempt: number, maxRetries: number, delay: number, error: any) => void // Callback function
}

export type ApiConfiguration = ApiHandlerOptions

// Models

interface PriceTier {
	tokenLimit: number // Upper limit (inclusive) of *input* tokens for this price. Use Infinity for the highest tier.
	price: number // Price per million tokens for this tier.
}

export interface ModelInfo {
	name?: string
	maxTokens?: number
	contextWindow?: number
	supportsImages?: boolean
	supportsPromptCache: boolean // this value is hardcoded for now
	supportsReasoning?: boolean // Whether the model supports reasoning/thinking mode
	inputPrice?: number // Keep for non-tiered input models
	outputPrice?: number // Keep for non-tiered output models
	thinkingConfig?: {
		maxBudget?: number // Max allowed thinking budget tokens
		outputPrice?: number // Output price per million tokens when budget > 0
		outputPriceTiers?: PriceTier[] // Optional: Tiered output price when budget > 0
		geminiThinkingLevel?: "low" | "high" // Optional: preset thinking level
		supportsThinkingLevel?: boolean // Whether the model supports thinking level (low/high)
	}
	supportsGlobalEndpoint?: boolean // Whether the model supports a global endpoint with Vertex AI
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	tiers?: {
		contextWindow: number
		inputPrice?: number
		outputPrice?: number
		cacheWritesPrice?: number
		cacheReadsPrice?: number
	}[]
	temperature?: number
	apiFormat?: ApiFormat // The API format used by this model
}

export interface OpenAiCompatibleModelInfo extends ModelInfo {
	temperature?: number
	isR1FormatRequired?: boolean
	systemRole?: "developer" | "system"
	supportsReasoningEffort?: boolean
	supportsTools?: boolean
	supportsStreaming?: boolean
}

export interface OcaModelInfo extends OpenAiCompatibleModelInfo {
	modelName: string
	surveyId?: string
	banner?: string
	surveyContent?: string
	supportsReasoning?: boolean
	reasoningEffortOptions: string[]
}

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models // prices updated 2025-01-02
export type AnthropicModelId = string
export const ANTHROPIC_MIN_THINKING_BUDGET = 1_024
export const ANTHROPIC_MAX_THINKING_BUDGET = 6_000

// AWS Bedrock
// https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
export type BedrockModelId = string

// OpenRouter
// https://openrouter.ai/models?order=newest&supported_parameters=tools
export const openRouterDefaultModelId = "anthropic/claude-sonnet-4.5" // will always exist in openRouterModels
export const openRouterDefaultModelInfo: ModelInfo = {
	maxTokens: 64_000,
	contextWindow: 200_000,
	supportsImages: true,
	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description:
		"Claude Sonnet 4.5 is an Anthropic model for coding, agentic search, and AI agent workflows. It supports planning and implementation tasks across the software development lifecycle.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
}

export type ClinePassModelId = keyof typeof clinePassModels
export const clinePassDefaultModelId = "cline-pass/glm-5.2"
export const clinePassModelInfoSaneDefaults: ModelInfo = {
	maxTokens: 8_192,
	contextWindow: 128_000,
	supportsImages: false,
	supportsPromptCache: false,
	supportsReasoning: true,
	inputPrice: 0,
	outputPrice: 0,
	cacheReadsPrice: 0,
	cacheWritesPrice: 0,
	description: "",
}
export const clinePassModels = {
	"cline-pass/glm-5.2": {
		name: "cline-pass/glm-5.2",
		maxTokens: 131_072,
		contextWindow: 202_752,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.98,
		outputPrice: 3.08,
		cacheReadsPrice: 0.182,
		cacheWritesPrice: 0,
		description: "",
	},
	"cline-pass/glm-5.1": {
		name: "cline-pass/glm-5.1",
		maxTokens: 131_072,
		contextWindow: 202_752,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.98,
		outputPrice: 3.08,
		cacheReadsPrice: 0.182,
		cacheWritesPrice: 0,
		description: "",
	},
} as const satisfies Record<string, ModelInfo>

export function getModelSlug(modelId: string): string {
	return modelId.split("/").at(-1) ?? modelId
}

export function buildModelInfoNameMap(models: Record<string, ModelInfo>): Record<string, ModelInfo> {
	const nameMap: Record<string, ModelInfo> = {}

	for (const [id, info] of Object.entries(models)) {
		nameMap[getModelSlug(id)] = info
	}

	return nameMap
}

export function resolveClinePassModelInfo(modelId: string, modelInfoByName?: Record<string, ModelInfo>): ModelInfo {
	const modelSlug = getModelSlug(modelId)
	const clinePassSlugModelId = `cline-pass/${modelSlug}`
	return (
		modelInfoByName?.[modelSlug] ??
		clinePassModels[modelId as keyof typeof clinePassModels] ??
		clinePassModels[clinePassSlugModelId as keyof typeof clinePassModels] ??
		clinePassModelInfoSaneDefaults
	)
}

export const openAiModelInfoSafeDefaults: OpenAiCompatibleModelInfo = {
	maxTokens: -1,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	isR1FormatRequired: false,
	inputPrice: 0,
	outputPrice: 0,
	temperature: 0,
}

// OpenAI Codex (ChatGPT Plus/Pro subscription)
// Uses OAuth authentication via ChatGPT, routes to chatgpt.com/backend-api/codex/responses
// Subscription-based pricing (all costs are $0).
//
// The Codex catalog and default model id are sourced from the `@cline/llms`
// SDK.
// Azure OpenAI
// https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-deprecation
// https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#api-specs
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview"

// Qwen
// https://bailian.console.aliyun.com/
// The first model in the list is used as the default model for each region

export enum QwenApiRegions {
	CHINA = "china",
	INTERNATIONAL = "international",
}
export const liteLlmDefaultModelId = "anthropic/claude-3-7-sonnet-20250219"
export interface LiteLLMModelInfo extends ModelInfo {
	temperature?: number
}

// Requesty
// https://requesty.ai/models
export const requestyDefaultModelId = "anthropic/claude-3-7-sonnet-latest"
export const requestyDefaultModelInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200_000,
	supportsImages: true,

	supportsPromptCache: true,
	inputPrice: 3.0,
	outputPrice: 15.0,
	cacheWritesPrice: 3.75,
	cacheReadsPrice: 0.3,
	description: "Anthropic's most intelligent model. Highest level of intelligence and capability.",
}
// SAP AI Core
export type SapAiCoreModelId = keyof typeof sapAiCoreModels
export const sapAiCoreDefaultModelId: SapAiCoreModelId = "anthropic--claude-3.5-sonnet"
// Pricing is calculated using Capacity Units, not directly in USD
const sapAiCoreModelDescription = "Pricing is calculated using SAP's Capacity Units rather than direct USD pricing."
export const sapAiCoreModels = {
	"anthropic--claude-4.5-haiku": {
		maxTokens: 64000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4.6-sonnet": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4.5-sonnet": {
		maxTokens: 64_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4-sonnet": {
		maxTokens: 64_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4.7-opus": {
		maxTokens: 128_000,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4.6-opus": {
		maxTokens: 128_000,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4.5-opus": {
		maxTokens: 64_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-4-opus": {
		maxTokens: 32_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-3.7-sonnet": {
		maxTokens: 64_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-3.5-sonnet": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-3-sonnet": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-3-haiku": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"anthropic--claude-3-opus": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"amazon--nova-pro": {
		maxTokens: 10_000,
		contextWindow: 300_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"amazon--nova-lite": {
		maxTokens: 10_000,
		contextWindow: 300_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"amazon--nova-micro": {
		maxTokens: 10_000,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"gemini-2.5-pro": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		thinkingConfig: {
			maxBudget: 32767,
		},
		description: sapAiCoreModelDescription,
	},
	"gemini-2.5-flash": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		thinkingConfig: {
			maxBudget: 24576,
		},
		description: sapAiCoreModelDescription,
	},
	"gemini-2.5-flash-lite": {
		maxTokens: 65535,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		thinkingConfig: {
			maxBudget: 24576,
		},
		description: sapAiCoreModelDescription,
	},
	"gemini-2.5-flash-image": {
		maxTokens: 32_768,
		contextWindow: 32_768,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"gpt-4": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"gpt-4o": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"gpt-4o-mini": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"gpt-4.1": {
		maxTokens: 32_768,
		contextWindow: 1_047_576,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-4.1-nano": {
		maxTokens: 32_768,
		contextWindow: 1_047_576,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5": {
		maxTokens: 128_000,
		contextWindow: 272_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5-nano": {
		maxTokens: 128_000,
		contextWindow: 272_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5-mini": {
		maxTokens: 128_000,
		contextWindow: 272_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5.2": {
		maxTokens: 128_000,
		contextWindow: 400_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5.5": {
		maxTokens: 128_000,
		contextWindow: 1_050_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5.4": {
		maxTokens: 128_000,
		contextWindow: 1_050_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"gpt-5.4-nano": {
		maxTokens: 128_000,
		contextWindow: 400_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	o1: {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	o3: {
		maxTokens: 100_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	"o3-mini": {
		maxTokens: 4096,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"o4-mini": {
		maxTokens: 100_000,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		description: sapAiCoreModelDescription,
	},
	sonar: {
		maxTokens: 128_000,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"sonar-pro": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"mistralai--mistral-medium-instruct": {
		maxTokens: 8192,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"mistralai--mistral-large-instruct": {
		maxTokens: 8192,
		contextWindow: 64_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"mistralai--mistral-small-instruct": {
		maxTokens: 8192,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"mistralai--mistral-small": {
		maxTokens: 8192,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
	"cohere--command-a-reasoning": {
		maxTokens: 8192,
		contextWindow: 256_000,
		supportsImages: false,
		supportsPromptCache: false,
		description: sapAiCoreModelDescription,
	},
} as const satisfies Record<string, ModelInfo>

// Moonshot AI Studio
// https://platform.moonshot.ai/docs/pricing/chat
export const moonshotModels = {
	"kimi-k2.6": {
		maxTokens: 32_000,
		contextWindow: 262_144,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.95,
		outputPrice: 4.0,
		cacheReadsPrice: 0.16,
		temperature: 1.0,
	},
	"kimi-k2.5": {
		maxTokens: 32_000,
		contextWindow: 262_144,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.6,
		outputPrice: 3.0,
		cacheReadsPrice: 0.1,
		temperature: 1.0,
	},
	"kimi-k2-0905-preview": {
		maxTokens: 16384,
		contextWindow: 262144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.5,
		temperature: 0.6,
	},
	"kimi-k2-0711-preview": {
		maxTokens: 32_000,
		contextWindow: 131_072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.5,
		temperature: 0.6,
	},
	"kimi-k2-turbo-preview": {
		maxTokens: 32_000,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.4,
		outputPrice: 10,
		temperature: 0.6,
	},
	"kimi-k2-thinking": {
		maxTokens: 32_000,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.5,
		temperature: 1.0,
	},
	"kimi-k2-thinking-turbo": {
		maxTokens: 32_000,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.4,
		outputPrice: 10,
		temperature: 1.0,
	},
} as const satisfies Record<string, OpenAiCompatibleModelInfo>
export type MoonshotModelId = keyof typeof moonshotModels
export const moonshotDefaultModelId = "kimi-k2-0905-preview" satisfies MoonshotModelId

// Huawei Cloud MaaS
// Dify.ai - No model selection needed, models are configured in Dify workflows

export type HuaweiCloudMaasModelId = keyof typeof huaweiCloudMaasModels
export const huaweiCloudMaasDefaultModelId: HuaweiCloudMaasModelId = "DeepSeek-V3"
export const huaweiCloudMaasModels = {
	"DeepSeek-V3": {
		maxTokens: 16_384,
		contextWindow: 64_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.27,
		outputPrice: 1.1,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
	},
	"DeepSeek-R1": {
		maxTokens: 16_384,
		contextWindow: 64_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.55,
		outputPrice: 2.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		thinkingConfig: {
			maxBudget: 8192,
			outputPrice: 2.2,
		},
	},
	"deepseek-r1-250528": {
		maxTokens: 16_384,
		contextWindow: 64_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.55,
		outputPrice: 2.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		thinkingConfig: {
			maxBudget: 8192,
			outputPrice: 2.2,
		},
	},
	"qwen3-235b-a22b": {
		maxTokens: 8_192,
		contextWindow: 32_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.27,
		outputPrice: 1.1,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		thinkingConfig: {
			maxBudget: 4096,
			outputPrice: 1.1,
		},
	},
	"qwen3-32b": {
		maxTokens: 8_192,
		contextWindow: 32_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.27,
		outputPrice: 1.1,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		thinkingConfig: {
			maxBudget: 4096,
			outputPrice: 1.1,
		},
	},
} as const satisfies Record<string, ModelInfo>

// Baseten
// https://baseten.co/products/model-apis/
// Extended ModelInfo to include supportedFeatures, like tools
export interface BasetenModelInfo extends ModelInfo {
	supportedFeatures?: string[]
}

export const basetenModels = {
	"moonshotai/Kimi-K2-Thinking": {
		maxTokens: 163_800,
		contextWindow: 262_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.5,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Kimi K2 Thinking - A model with enhanced reasoning capabilities from Kimi K2",
		supportsReasoning: true,
	},
	"zai-org/GLM-4.6": {
		maxTokens: 200_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Frontier open model with advanced agentic, reasoning and coding capabilities",
		supportsReasoning: true,
	},
	"deepseek-ai/DeepSeek-R1": {
		maxTokens: 131_072,
		contextWindow: 163_840,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.55,
		outputPrice: 5.95,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "DeepSeek's first-generation reasoning model",
		supportsReasoning: true,
	},
	"deepseek-ai/DeepSeek-R1-0528": {
		maxTokens: 131_072,
		contextWindow: 163_840,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 2.55,
		outputPrice: 5.95,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "The latest revision of DeepSeek's first-generation reasoning model",
		supportsReasoning: true,
	},
	"deepseek-ai/DeepSeek-V3-0324": {
		maxTokens: 131_072,
		contextWindow: 163_840,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.77,
		outputPrice: 0.77,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Fast general-purpose LLM with enhanced reasoning capabilities",
		supportsReasoning: true,
	},
	"deepseek-ai/DeepSeek-V3.1": {
		maxTokens: 131_072,
		contextWindow: 163_840,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.5,
		outputPrice: 1.5,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Extremely capable general-purpose LLM with hybrid reasoning capabilities and advanced tool calling",
		supportsReasoning: true,
	},
	"deepseek-ai/DeepSeek-V3.2": {
		maxTokens: 131_072,
		contextWindow: 163_840,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.3,
		outputPrice: 0.45,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "DeepSeek's hybrid reasoning model with efficient long context scaling with GPT-5 level performance",
		supportsReasoning: true,
	},
	"Qwen/Qwen3-235B-A22B-Instruct-2507": {
		maxTokens: 262_144,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.22,
		outputPrice: 0.8,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Mixture-of-experts LLM with math and reasoning capabilities",
		supportsReasoning: false,
	},
	"Qwen/Qwen3-Coder-480B-A35B-Instruct": {
		maxTokens: 262_144,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.38,
		outputPrice: 1.53,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Mixture-of-experts LLM with advanced coding and reasoning capabilities",
		supportsReasoning: false,
	},
	"openai/gpt-oss-120b": {
		maxTokens: 128_072,
		contextWindow: 128_072,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.1,
		outputPrice: 0.5,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Extremely capable general-purpose LLM with strong, controllable reasoning capabilities",
		supportsReasoning: true,
	},
	"moonshotai/Kimi-K2-Instruct-0905": {
		maxTokens: 168_000,
		contextWindow: 262_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.6,
		outputPrice: 2.5,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "State of the art language model for agentic and coding tasks. September Update.",
		supportsReasoning: false,
	},
} as const satisfies Record<string, ModelInfo>
export type BasetenModelId = keyof typeof basetenModels
export const basetenDefaultModelId = "zai-org/GLM-4.6" satisfies BasetenModelId

// Z AI
// https://docs.z.ai/guides/llm/glm-5.2
// https://docs.z.ai/guides/llm/glm-5.1
// https://docs.z.ai/guides/llm/glm-5
// https://docs.z.ai/guides/overview/pricing
export type internationalZAiModelId = keyof typeof internationalZAiModels
export const internationalZAiDefaultModelId: internationalZAiModelId = "glm-5.1"
export const internationalZAiModels = {
	"glm-5.2": {
		maxTokens: 128_000,
		contextWindow: 1_000_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.26,
		inputPrice: 1.4,
		outputPrice: 4.4,
	},
	"glm-5.1": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.26,
		inputPrice: 1.4,
		outputPrice: 4.4,
	},
	"glm-5": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.2,
		inputPrice: 1.0,
		outputPrice: 3.2,
	},
	"glm-4.7": {
		maxTokens: 131_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.11,
		inputPrice: 0.6,
		outputPrice: 2.2,
	},
	"glm-4.6": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.11,
		inputPrice: 0.6,
		outputPrice: 2.2,
	},
	"glm-4.5": {
		maxTokens: 98_304,
		contextWindow: 131_072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.6,
		outputPrice: 2.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.11,
		description:
			"GLM-4.5 is Zhipu's latest featured model. Its comprehensive capabilities in reasoning, coding, and agent reach the state-of-the-art (SOTA) level among open-source models, with a context length of up to 128k.",
	},
	"glm-4.5-air": {
		maxTokens: 98304, // Quantization: fp8
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.2,
		outputPrice: 1.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.03,
		description:
			"GLM-4.5-Air is the lightweight version of GLM-4.5. It balances performance and cost-effectiveness, and can flexibly switch to hybrid thinking models.",
	},
} as const satisfies Record<string, ModelInfo>

export type mainlandZAiModelId = keyof typeof mainlandZAiModels
export const mainlandZAiDefaultModelId: mainlandZAiModelId = "glm-5.1"
export const mainlandZAiModels = {
	"glm-5.2": {
		maxTokens: 128_000,
		contextWindow: 1_000_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.26,
		inputPrice: 1.4,
		outputPrice: 4.4,
	},
	"glm-5.1": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.26,
		inputPrice: 1.4,
		outputPrice: 4.4,
	},
	"glm-5": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.2,
		inputPrice: 1.0,
		outputPrice: 3.2,
	},
	"glm-4.7": {
		maxTokens: 131_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.11,
		inputPrice: 0.6,
		outputPrice: 2.2,
	},
	"glm-4.6": {
		maxTokens: 128_000,
		contextWindow: 200_000,
		supportsImages: false,
		supportsPromptCache: true,
		cacheReadsPrice: 0.11,
		inputPrice: 0.6,
		outputPrice: 2.2,
	},
	"glm-4.5": {
		maxTokens: 98_304,
		contextWindow: 131_072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.29,
		outputPrice: 1.14,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.057,
		description:
			"GLM-4.5 is Zhipu's latest featured model. Its comprehensive capabilities in reasoning, coding, and agent reach the state-of-the-art (SOTA) level among open-source models, with a context length of up to 128k.",
		tiers: [
			{
				contextWindow: 32_000,
				inputPrice: 0.21,
				outputPrice: 1.0,
				cacheReadsPrice: 0.043,
			},
			{
				contextWindow: 128_000,
				inputPrice: 0.29,
				outputPrice: 1.14,
				cacheReadsPrice: 0.057,
			},
			{
				contextWindow: Number.POSITIVE_INFINITY,
				inputPrice: 0.29,
				outputPrice: 1.14,
				cacheReadsPrice: 0.057,
			},
		],
	},
	"glm-4.5-air": {
		maxTokens: 98304, // Quantization: fp8
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.086,
		outputPrice: 0.57,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.017,
		description:
			"GLM-4.5-Air is the lightweight version of GLM-4.5. It balances performance and cost-effectiveness, and can flexibly switch to hybrid thinking models.",
		tiers: [
			{
				contextWindow: 32_000,
				inputPrice: 0.057,
				outputPrice: 0.43,
				cacheReadsPrice: 0.011,
			},
			{
				contextWindow: 128_000,
				inputPrice: 0.086,
				outputPrice: 0.57,
				cacheReadsPrice: 0.017,
			},
			{
				contextWindow: Number.POSITIVE_INFINITY,
				inputPrice: 0.086,
				outputPrice: 0.57,
				cacheReadsPrice: 0.017,
			},
		],
	},
} as const satisfies Record<string, ModelInfo>

// Fireworks AI
export type FireworksModelId = keyof typeof fireworksModels
export const fireworksDefaultModelId: FireworksModelId = "accounts/fireworks/models/kimi-k2p6"
export const fireworksModels = {
	"accounts/fireworks/models/kimi-k2p7-code": {
		maxTokens: 262000,
		contextWindow: 262000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.95,
		outputPrice: 4,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.19,
		description:
			"Moonshot's latest open coding model. Kimi K2.7 Code unifies vision and text, thinking and non-thinking modes, and single-agent and multi-agent execution.",
	},
	"accounts/fireworks/models/kimi-k2p6": {
		maxTokens: 262000,
		contextWindow: 262000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.95,
		outputPrice: 4,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.16,
		description:
			"Moonshot's latest open agentic model. Kimi K2.6 unifies vision and text, thinking and non-thinking modes, and single-agent and multi-agent execution.",
	},
	"accounts/fireworks/routers/kimi-k2p6-turbo": {
		maxTokens: 262000,
		contextWindow: 262000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 2,
		outputPrice: 8,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.3,
		description:
			"Kimi K2.6 Turbo router for high-performance agentic workloads with vision and text reasoning.",
	},
	"accounts/fireworks/routers/kimi-k2p6-fast": {
		maxTokens: 262000,
		contextWindow: 262000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 2,
		outputPrice: 8,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.3,
		description:
			"Kimi K2.6 Fast router for high-performance agentic workloads with vision and text reasoning.",
	},
	"accounts/fireworks/routers/kimi-k2p7-code-fast": {
		maxTokens: 262000,
		contextWindow: 262000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 1.9,
		outputPrice: 8,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.38,
		description:
			"Kimi K2.7 Code Fast router for high-performance coding workloads with vision and text reasoning.",
	},
	"accounts/fireworks/models/deepseek-v4-flash": {
		maxTokens: 384000,
		contextWindow: 1000000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.14,
		outputPrice: 0.28,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.028,
		description:
			"DeepSeek V4 Flash is a fast, cost-efficient reasoning model with a 1M context window and strong tool-use capabilities.",
	},
	"accounts/fireworks/models/deepseek-v4-pro": {
		maxTokens: 384000,
		contextWindow: 1000000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 1.74,
		outputPrice: 3.48,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.145,
		description:
			"DeepSeek V4 Pro is a flagship reasoning model with a 1M context window, advanced structured output, and agentic performance.",
	},
	"accounts/fireworks/models/glm-5p2": {
		maxTokens: 131072,
		contextWindow: 1048576,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 1.4,
		outputPrice: 4.4,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.26,
		description: "GLM 5.2 is a next-generation general-purpose model optimized for coding, reasoning, and agentic workflows with a 1M context window.",
	},
	"accounts/fireworks/models/glm-5p1": {
		maxTokens: 131072,
		contextWindow: 202800,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 1.4,
		outputPrice: 4.4,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.26,
		description: "GLM 5.1 is a next-generation general-purpose model optimized for coding, reasoning, and agentic workflows.",
	},
	"accounts/fireworks/routers/glm-5p1-fast": {
		maxTokens: 131072,
		contextWindow: 202800,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 2.8,
		outputPrice: 8.8,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.52,
		description: "GLM 5.1 Fast router for high-throughput coding, reasoning, and agentic workflows.",
	},
	"accounts/fireworks/models/minimax-m3": {
		maxTokens: 512000,
		contextWindow: 512000,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.06,
		description: "MiniMax M3 is built for state-of-the-art coding, agentic tool use, and long-context multimodal tasks.",
	},
	"accounts/fireworks/models/minimax-m2p7": {
		maxTokens: 196608,
		contextWindow: 196608,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.06,
		description: "MiniMax M2.7 is tuned for strong real-world performance across coding, agent-driven, and workflow-heavy tasks.",
	},
	"accounts/fireworks/models/qwen3p7-plus": {
		maxTokens: 262144,
		contextWindow: 262144,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.4,
		outputPrice: 1.6,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.08,
		description: "Qwen 3.7 Plus with strong multimodal reasoning, long context support, and function calling.",
	},
	"accounts/fireworks/models/gpt-oss-120b": {
		maxTokens: 32768,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.15,
		outputPrice: 0.6,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.015,
		description: "OpenAI GPT OSS 120B open-weight model for production and high-reasoning use cases.",
	},
	"accounts/fireworks/models/gpt-oss-20b": {
		maxTokens: 32768,
		contextWindow: 131072,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.07,
		outputPrice: 0.3,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0.035,
		description: "OpenAI GPT OSS 20B open-weight model for efficient production and reasoning use cases.",
	},
} as const satisfies Record<string, ModelInfo>

// Qwen Code
// https://chat.qwen.ai/
export const qwenCodeModels = {
	"qwen3-coder-plus": {
		maxTokens: 65_536,
		contextWindow: 1_000_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Qwen3 Coder Plus - High-performance coding model with 1M context window for large codebases",
	},
	"qwen3-coder-flash": {
		maxTokens: 65_536,
		contextWindow: 1_000_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
		description: "Qwen3 Coder Flash - Fast coding model with 1M context window optimized for speed",
	},
} as const satisfies Record<string, ModelInfo>
export type QwenCodeModelId = keyof typeof qwenCodeModels
export const qwenCodeDefaultModelId: QwenCodeModelId = "qwen3-coder-plus"

// Minimax
// https://www.minimax.io/platform/document/text_api_intro
// https://www.minimax.io/platform/document/pricing
export type MinimaxModelId = keyof typeof minimaxModels
export const minimaxDefaultModelId: MinimaxModelId = "MiniMax-M2.7"
export const minimaxModels = {
	"MiniMax-M3": {
		maxTokens: 32_000,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.6,
		outputPrice: 2.4,
		cacheWritesPrice: 0.6,
		cacheReadsPrice: 0.12,
		tiers: [
			{
				contextWindow: 512_000,
				inputPrice: 0.6,
				outputPrice: 2.4,
				cacheWritesPrice: 0.6,
				cacheReadsPrice: 0.12,
			},
			{
				contextWindow: Number.MAX_SAFE_INTEGER,
				inputPrice: 1.2,
				outputPrice: 4.8,
				cacheWritesPrice: 1.2,
				cacheReadsPrice: 0.24,
			},
		],
		description: "Latest M-series model for coding, agentic reasoning, tool use, and long-context multimodal tasks",
	},
	"MiniMax-M2.7": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.06,
		description: "Latest flagship model with enhanced reasoning and coding",
	},
	"MiniMax-M2.7-highspeed": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.6,
		outputPrice: 2.4,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.06,
		description: "High-speed version of M2.7 for low-latency scenarios",
	},
	"MiniMax-M2.5": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.03,
	},
	"MiniMax-M2.5-highspeed": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 0.6,
		outputPrice: 2.4,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.03,
	},
	"MiniMax-M2.1": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.03,
	},
	"MiniMax-M2.1-lightning": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.6,
		outputPrice: 2.4,
		cacheWritesPrice: 0.375,
		cacheReadsPrice: 0.03,
	},
	"MiniMax-M2": {
		maxTokens: 128_000,
		contextWindow: 192_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.3,
		outputPrice: 1.2,
		cacheWritesPrice: 0,
		cacheReadsPrice: 0,
	},
} as const satisfies Record<string, ModelInfo>

// NousResearch
// https://inference-api.nousResearch.com
export type NousResearchModelId = keyof typeof nousResearchModels
export const nousResearchDefaultModelId: NousResearchModelId = "Hermes-4-405B"
export const nousResearchModels = {
	"Hermes-4-405B": {
		maxTokens: 8192,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.09,
		outputPrice: 0.37,
		description:
			"This is the largest model in the Hermes 4 family, and it is the fullest expression of our design, focused on advanced reasoning and creative depth rather than optimizing inference speed or cost.",
	},
	"Hermes-4-70B": {
		maxTokens: 8192,
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: false,
		inputPrice: 0.05,
		outputPrice: 0.2,
		description:
			"This incarnation of Hermes 4 balances scale and size. It handles complex reasoning tasks, while staying fast and cost effective. A versatile choice for many use cases.",
	},
} as const satisfies Record<string, ModelInfo>
