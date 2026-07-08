import { describe, expect, it } from "vitest";
import { safeParseSettings, toProviderConfig } from "./provider-settings";

describe("provider settings", () => {
	it("formats Cline OAuth access tokens for runtime API keys", () => {
		const config = toProviderConfig({
			provider: "cline",
			model: "anthropic/claude-sonnet-4.6",
			auth: {
				accessToken: "oauth-access-token",
			},
		});

		expect(config.apiKey).toBe("workos:oauth-access-token");
		expect(config.accessToken).toBe("oauth-access-token");
	});

	it("uses curated ChatGPT subscription model limits instead of generated OpenAI API limits", () => {
		const config = toProviderConfig({
			provider: "openai-codex",
			model: "gpt-5.5",
		});

		expect(config.knownModels?.["gpt-5.5"]).toMatchObject({
			contextWindow: 1_000_000,
			maxInputTokens: (1_000_000 - 128_000) * 0.95,
			maxTokens: 128_000,
		});
	});

	it("accepts the Bedrock apikey authentication alias", () => {
		const result = safeParseSettings({
			provider: "bedrock",
			model: "anthropic.claude-sonnet-4-5-20250929-v1:0",
			aws: {
				authentication: "apikey",
				region: "us-east-1",
			},
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			throw new Error("expected Bedrock apikey settings to parse");
		}

		expect(toProviderConfig(result.data).aws).toEqual(
			expect.objectContaining({
				authentication: "apikey",
			}),
		);
	});
});
