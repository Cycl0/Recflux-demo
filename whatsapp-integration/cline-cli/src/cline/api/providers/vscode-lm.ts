import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler, SingleCompletionHandler } from "../"
import { ApiStream } from "@api/transform/stream"
import { ApiHandlerOptions, ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"

export class VsCodeLmHandler implements ApiHandler, SingleCompletionHandler {
	constructor(options: ApiHandlerOptions) {
		throw new Error("Method not implemented.")
	}

	dispose(): void {
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		throw new Error("Method not implemented.")
	}

	// Return model information based on the current client state
	getModel(): { id: string; info: ModelInfo } {
		throw new Error("Method not implemented.")
	}

	async completePrompt(prompt: string): Promise<string> {
		throw new Error("Method not implemented.")
	}
}
