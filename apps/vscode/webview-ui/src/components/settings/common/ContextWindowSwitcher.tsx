import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface ContextWindowSwitcherProps {
	base1mModelId: string
	base200kModelId: string
	selectedModelId: string
	onModelChange: (modelId: string) => void
}

export function ContextWindowSwitcher({
	base1mModelId,
	base200kModelId,
	selectedModelId,
	onModelChange,
}: ContextWindowSwitcherProps) {
	if (selectedModelId !== base1mModelId && selectedModelId !== base200kModelId) {
		return null
	}

	const isUsing1mContext = selectedModelId === base1mModelId
	const nextModelId = isUsing1mContext ? base200kModelId : base1mModelId

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
			<span style={{ color: "var(--vscode-descriptionForeground)", fontSize: 12 }}>
				Context window: {isUsing1mContext ? "1M" : "200K"}
			</span>
			<VSCodeButton appearance="secondary" onClick={() => onModelChange(nextModelId)}>
				Switch to {isUsing1mContext ? "200K" : "1M"}
			</VSCodeButton>
		</div>
	)
}