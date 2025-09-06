import * as vscode from "vscode-interface"
import { MementoImpl } from "./mementoImpl"
import { SecretStorageImpl } from "./secretStorageImpl";

export class ExtensionContextImpl implements vscode.ExtensionContext {
    readonly subscriptions: { dispose(): any; }[];
    workspaceState: vscode.Memento;
    globalState: vscode.Memento;
    secrets: vscode.SecretStorage;
    extensionUri: vscode.Uri;
    globalStorageUri: vscode.Uri;
    extensionMode: vscode.ExtensionMode;
    extension?: vscode.Extension<any> | undefined;

    constructor(storage: vscode.Uri) {
        this.subscriptions = [];
        this.workspaceState = new MementoImpl();
        this.globalState = new MementoImpl();
        this.secrets = new SecretStorageImpl();
        this.extensionUri = storage
        this.globalStorageUri = storage
        this.extensionMode = vscode.ExtensionMode.Production
        this.extension = undefined

        this.setSecretsFromEnv()
    }

    setGlobalState(globalState: Record<string, any>) {
        for (const [key, value] of Object.entries(globalState)) {
            if (value == "") {
                continue
            }
            this.globalState.update(key, value)
        }
    }

    private setSecretsFromEnv() {
		this.setSecretFromEnv("API_KEY", "apiKey")
		this.setSecretFromEnv("OPEN_ROUTER_API_KEY","openRouterApiKey")
		this.setSecretFromEnv("CLINE_API_KEY", "clineApiKey")
		this.setSecretFromEnv("AWS_ACCESS_KEY", "awsAccessKey")
		this.setSecretFromEnv("AWS_SECRET_KEY", "awsSecretKey")
		this.setSecretFromEnv("AWS_SESSION_TOKEN", "awsSessionToken")
		this.setSecretFromEnv("OPEN_AI_API_KEY", "openAiApiKey")
		this.setSecretFromEnv("GEMINI_API_KEY", "geminiApiKey")
		this.setSecretFromEnv("OPEN_AI_NATIVE_API_KEY", "openAiNativeApiKey")
		this.setSecretFromEnv("DEEP_SEEK_API_KEY", "deepSeekApiKey")
		this.setSecretFromEnv("REQUESTY_API_KEY", "requestyApiKey")
		this.setSecretFromEnv("TOGETHER_API_KEY", "togetherApiKey")
		this.setSecretFromEnv("QWEN_API_KEY", "qwenApiKey")
		this.setSecretFromEnv("DOUBAO_API_KEY", "doubaoApiKey")
		this.setSecretFromEnv("MISTRAL_API_KEY", "mistralApiKey")
		this.setSecretFromEnv("LITE_LLM_API_KEY", "liteLlmApiKey")
		this.setSecretFromEnv("ASKSAGE_API_KEY", "asksageApiKey")
		this.setSecretFromEnv("XAI_API_KEY", "xaiApiKey")
		this.setSecretFromEnv("SAMBANOVA_API_KEY", "sambanovaApiKey")
    }

    private setSecretFromEnv(env: string, secretKey: string) {
        const envValue = process.env[env]
        if (envValue) {
            this.secrets.store(secretKey, envValue)
        }
    }
}
