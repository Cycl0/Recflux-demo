import * as vscode from "vscode-interface"
import * as webview from "./webview"
import * as cline from "cline/exports"
import { TaskServiceClient } from "./grpc-client"
import { ClineAPI } from "cline/exports/cline"
import { WebviewProvider } from "cline/core/webview"
import { WebviewImpl, WebviewViewImpl } from "./webviewImpl"
import {
    ClineMessage,
    ExtensionMessage,
    ClineAskQuestion,
    ClineSayTool,
    ClineSayBrowserAction,
} from "cline/shared/ExtensionMessage"
import { createInterface, Interface as ReadLineInterface } from "readline"
import { WebviewMessage } from "cline/shared/WebviewMessage"
import { console } from "./setup"
import { sleep } from "openai/core.mjs"
import { HistoryItem } from "cline/shared/HistoryItem"
import * as fs from "fs"

export class TaskController {
    private _context: vscode.ExtensionContext
    private _fullAuto: boolean = false
    private _forceApprovalMcpTool: boolean = false
    private _clineAPI: ClineAPI
    private _partialLastMessageLength: number = 0
    private _partialLastMessageTs: number = 0
    private _partialLastMessageWriting: boolean = false
    private _lastMessage?: ClineMessage
    private _askingMessageTs: number = -1
    private _webview: WebviewImpl
    private _readline: ReadLineInterface
    private _waitVersion: number = 0
    private _errorAccumulator: number = 0
    private _isAborting: boolean = false
    private _autoResume: boolean = false
    private _autoStartNewTask: boolean = false
    private _task?: string

    constructor(context: vscode.ExtensionContext, forceApprovalMcpTool: boolean) {
        // do nothing
        const outputChannel: vscode.OutputChannel = {
            appendLine: function (value: string): void {
            },
            dispose: function (): void {
            }
        }

        this._context = context
        this._forceApprovalMcpTool = forceApprovalMcpTool

        const sidebarWebview = new WebviewProvider(context, outputChannel)
        this._webview = new WebviewImpl()
        webview.setWebview(this._webview)
        const webviewView = new WebviewViewImpl(this._webview)
        sidebarWebview.resolveWebviewView(webviewView)
        this._clineAPI = cline.createClineAPI(outputChannel, sidebarWebview.controller)

        let timeoutId: NodeJS.Timeout | undefined
        this._webview.onPostMessage(e => {
            const message: ExtensionMessage = e

            if (this._fullAuto) {
                const noResponseTimeout = 300 * 1000 // 5 minutes timeout for model responses
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }
                timeoutId = setTimeout(() =>
                {
                    console.error("No response from cline.")
                    this.abort()
                }, noResponseTimeout)
            }

            switch (message.type) {
                case "state":
                case "partialMessage":
                    if (message.type === "state")  {
                        this._lastMessage = message.state?.clineMessages?.at(-1)
                    }
                    else {
                        this._lastMessage = message.partialMessage
                    }

                    // console.log("lastMessage", this._lastMessage)

                    if (this._lastMessage == null) {
                        return
                    }

                    if (this._lastMessage.say === "text" || this._lastMessage.say === "reasoning") {
                        this._errorAccumulator = 0
                    }

                    if (this._lastMessage.type === "ask") {
                        if (!this._lastMessage.partial) {
                            this.waitAskApproval()
                        }
                    }
                    else {
                        this.presentPartialMessage(this._lastMessage)
                    }
                    break

                case "invoke":
                    if (message.invoke === "sendMessage" && this._lastMessage == null) {
                        this.emitMessageToExtension({
                            type: "newTask",
                            text: message.text,
                            images: message.images,
                        })
                    }
                    break
            }
        })

        this._readline = createInterface({
            input: process.stdin,
            output: process.stdout,
        })

        this._readline.on("SIGINT", async () => {
            this.abort()
        })

        process.on("unhandledRejection", err => {
            // prevent process exit before writing file is complete
            if (this._isAborting) {
                return
            }

            console.error(err)
            this.exit(-1)
        })
    }

    private async abort(exitCode: number = -1) {
        if (this._isAborting) {
            return
        }

        // If no task has been started, the process will exit
        if (!this._task) {
            this.exit(0)
            return
        }

        this._isAborting = true
        this._readline.write("\n\naborting...")

        TaskServiceClient.cancelTask({})

        await sleep(3000)
        this.exit(exitCode)
    }

    private presentPartialMessage(message: ClineMessage) {
        if (message.type !== "say") {
            return
        }

        let text = message.text ?? ""
        switch (message.say) {
            case "tool":
                const clineSayTool: ClineSayTool = JSON.parse(text)
                text = clineSayTool.content ?? ""
                break
            case "browser_action":
                const clineSayBrowserAction: ClineSayBrowserAction = JSON.parse(text)
                text = clineSayBrowserAction.text ?? ""
                break
        }

        let write = false
        if (this._partialLastMessageLength === 0 || this._partialLastMessageTs !== message.ts) {
            if (this._partialLastMessageWriting) {
                this._readline.write("\n\n")
            }

            this._readline.write(`Cline message:\ntype: ${message.type}\nsay: ${message.say}\ntext:\n`)

            if (text.length > 0) {
                this._readline.write(text)
                write = true
            }
        }
        else if (text.length > this._partialLastMessageLength) {
            const newMessage = text.substring(this._partialLastMessageLength)
            this._readline.write(newMessage)
            write = true
        }

        this._partialLastMessageTs = message.ts
        this._partialLastMessageLength = text?.length ?? 0
        this._partialLastMessageWriting = true

        if (write && !message.partial) {
            this._readline.write("\n\n")
            this._partialLastMessageWriting = false
        }
    }

    setCustomInstructions(value: string) {
        this._clineAPI.setCustomInstructions(value)
    }

    setFullAutoMode() {
        this._fullAuto = true
    }

    startNewTask(task: string) {
        this._task = task
        this._clineAPI.startNewTask(task)
    }

    resumeTask(task: string) {
        return this.resumeTaskInternal(task, false)
    }

    async resumeOrStartNewTask(task: string) {
        return this.resumeTaskInternal(task, true)
    }

    private async resumeTaskInternal(task: string, autoStartNewTask: boolean) {
        this._task = task
        const taskHistory = await this.loadTaskHistoryFromFile()
        const historyItem = taskHistory?.reverse()?.find(x => x.task === task)
        if (!historyItem) {
            this._readline.write("No task found, start a new task.\n\n")
            this.startNewTask(task)
            return
        }

        this._autoResume = true
        this._autoStartNewTask = autoStartNewTask
        
        this.emitMessageToExtension({
            type: "showTaskWithId",
            text: historyItem.id,
        })
    }

    private async ask(message: ClineMessage, text: string): Promise<string | undefined> {
        this._readline.write("\n\n")
        const prompt = `Cline is asking:\ntype: ${message.type}\nask: ${message.ask}\n\n${text}`


        if (message.ask === "resume_task") {
            // When a task is canceled, cline will ask if you want to resume the task.
            if (this._isAborting) {
                this.exit(-1)
                return
            }

            // When called from resumeTask/resumeOrNewTask
            if (this._autoResume) {
                this._autoResume = false
                this._autoStartNewTask = false

                this._readline.write(prompt + "\n")
                this.emitMessageToExtension({
                    type: "askResponse",
                    askResponse: "yesButtonClicked",
                })

                return undefined
            }
        }

        if (this._fullAuto) {
            this._readline.write(prompt + "\n")

            // TODO: Create MCP Tool settings to automatically approval
            if (message.ask === "use_mcp_server" && this._forceApprovalMcpTool) {
                this._readline.write("Auto approval use mcp tool\n")
                this.emitMessageToExtension({
                    type: "askResponse",
                    askResponse: "yesButtonClicked",
                })

                return undefined
            }

            if (message.ask === "api_req_failed") {
                this._readline.write("Retry in 5 seconds\n")
                await sleep(5000)
                this.emitMessageToExtension({
                    type: "askResponse",
                    askResponse: "yesButtonClicked",
                })

                return undefined
            }

            // Auto-approve attempt_completion tool in full-auto mode
            if (message.ask === "tool" && message.text && message.text.includes("attempt_completion")) {
                this._readline.write("Auto approving task completion\n")
                this.emitMessageToExtension({
                    type: "askResponse",
                    askResponse: "yesButtonClicked",
                })

                return undefined
            }

            const fullAutoModeMessage = "I can't respond because I'm in full auto mode.\nIf you already have a task completion, use the attempt_completion tool without command."
            this.emitMessageToExtension({
                type: "askResponse",
                askResponse: "messageResponse",
                text: fullAutoModeMessage,
            })

            return undefined
        }

        return await this.questionPromise(prompt)
    }

    private questionPromise(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this._readline.question(prompt, (answer) => {
                resolve(answer)
            })
        })
    }

    async waitStartNewTask() {
        const task = await this.questionPromise("Type your task here...\n")
        this.startNewTask(task)
    }

    private async waitAskApproval() {
        if (this._lastMessage == null) {
            throw new Error("Missing last message")
        }

        if (this._lastMessage.ts === this._askingMessageTs) {
            // this question has already been asked
            return
        }

        this._askingMessageTs = this._lastMessage.ts

        // from ChatView.tsx
        let ask: () => Promise<boolean>
        const message = this._lastMessage
        switch (this._lastMessage.ask) {
            case "followup":
                ask = () => this.waitFollowupAskApproval(message)
                break;
            case "api_req_failed":
            case "mistake_limit_reached":
                this._errorAccumulator++
                if (this._errorAccumulator > 3) {
                    console.error("Maximum retries reached")
                    this.abort()
                    return
                }
                ask = () => this.waitYesOrMessageAskApproval(message)
                break
            case "auto_approval_max_req_reached":
                if (this._fullAuto) {
                    console.error("Auto approval limit reached. Aborting the process.")
                    this.abort()
                    return
                }

                ask = () => this.waitYesOrMessageAskApproval(message)
                break
            case "command_output":
            case "resume_task":
                ask = () => this.waitYesOrMessageAskApproval(message)
                break
            case "command":
            case "tool":
            case "browser_action_launch":
            case "use_mcp_server":
                ask = () => this.waitYesOrNoAskApproval(message)
                break
            case "completion_result":
            case "resume_completed_task":
                if (this._autoResume) {
                    this._readline.write("\nThe task is already completed.\n")

                    if (this._autoStartNewTask) {
                        this._readline.write("Start a new task.\n\n")
                        this._autoResume = false
                        this._autoStartNewTask = false
                        this.startNewTask(this._task!)
                        return
                    }
                }

                if (this._isAborting) {
                    return
                }

                if (this._fullAuto) {
                    setTimeout(() => this.exit(), 1000)
                    return
                }
                else {
                    ask = () => this.waitMessageAskApproval(message)
                }
                break
            default:
                // finish
                this.exit()
                return
        }

        const result = await ask()
        if (result) {
            this._askingMessageTs = -1
        }
    }


    private async waitFollowupAskApproval(message: ClineMessage): Promise<boolean> {
        this._waitVersion++
        const waitVersion = this._waitVersion

        const question: ClineAskQuestion = JSON.parse(message.text!)

        let prompt = `Question:\n${question.question}`

        let options = question.options ?? []
        if (options.length > 0) {
            prompt += "\nOptions:\n"
            let number = 1
            for (const option of options) {
                const numberStr = `${number}.`
                if (option.startsWith(numberStr)) {
                    prompt += `${option}\n`
                }
                else {
                    prompt += `${number}. ${option}\n`
                }
                number++
            }

            prompt += "\nPlease select an option by typing the number.\n"
        }

        let result = await this.ask(message, prompt)
        if (waitVersion !== this._waitVersion) {
            return false
        }

        if (!result) {
            return true
        }

        if (options.length) {
            const index = parseInt(result, 10) - 1
            if (Number.isNaN(index)) {
                // Allow responses outside of the provided options
            }
            else if (index >= 0 && index < options.length) {
                result = options[index]
            }
            else {
                this._readline.write("Invalid option. Please try again.\n")
                return await this.waitFollowupAskApproval(message)
            }
        }

        this.emitMessageToExtension({
            type: "askResponse",
            askResponse: "messageResponse",
            text: result,
        })

        return true
    }

    private async waitMessageAskApproval(message: ClineMessage): Promise<boolean> {
        this._waitVersion++
        const waitVersion = this._waitVersion

        let result = await this.ask(message, "Please enter the next task:\n")
        if (waitVersion !== this._waitVersion) {
            return false
        }

        if (!result) {
            return true
        }

        this.emitMessageToExtension({
            type: "askResponse",
            askResponse: "messageResponse",
            text: result,
        })

        return true
    }

    private async waitYesOrMessageAskApproval(message: ClineMessage): Promise<boolean> {
        this._waitVersion++
        const waitVersion = this._waitVersion

        const textForDisplay = message.text != null ? `text: ${message.text}\n` : ""
        const prompt = `${textForDisplay}\nPlease type yes(y) or no(n).\n`

        const result = await this.ask(message, prompt)
        if (waitVersion !== this._waitVersion) {
            return false
        }

        if (!result) {
            return true
        }

        if (this.isYes(result)) {
            this.emitMessageToExtension({
                type: "askResponse",
                askResponse: "yesButtonClicked",
            })
        }
        else {
            this.emitMessageToExtension({
                type: "askResponse",
                askResponse: "messageResponse",
                text: result,
            })
        }

        return true
    }

    private async waitYesOrNoAskApproval(message: ClineMessage): Promise<boolean> {
        this._waitVersion++
        const waitVersion = this._waitVersion

        const textForDisplay = message.text != null ? `text: ${message.text}\n` : ""
        const prompt = `${textForDisplay}\nPlease type yes(y) or no(n).\n`

        const result = await this.ask(message, prompt)
        if (waitVersion !== this._waitVersion) {
            return false
        }

        if (!result) {
            return true
        }

        if (this.isYes(result)) {
            this.emitMessageToExtension({
                type: "askResponse",
                askResponse: "yesButtonClicked",
            })
        }
        else {
            this.emitMessageToExtension({
                type: "askResponse",
                askResponse: "noButtonClicked",
            })
        }

        return true
    }

    private isYes(input: string): boolean {
        switch (input.toLowerCase()) {
            case "yes":
            case "y":
            case "sure":
            case "ok":
            case "okay":
                return true
            default:
                return false
        }
    }

    private emitMessageToExtension(message: WebviewMessage) {
        this._webview.onDidReceiveMessageEmitter.fire(message)
    }

    private async exit(code: number = 0) {
        const taskHistory = await this._context.globalState.get<HistoryItem[] | undefined>("taskHistory")
        if (taskHistory) {
            this.writeTaskHistory(taskHistory)
        }

        process.exit(code)
    }

    loadTaskHistoryFromFile(): HistoryItem[] {
        try {
            const path = this.getTaskHistoryPath()
            const json = fs.readFileSync(path, "utf-8")
            const taskHistory = JSON.parse(json)
            this._context.globalState.update("taskHistory", taskHistory)
            return taskHistory
        }
        catch (error) {
            console.error(error)
            return []
        }
    }

    private writeTaskHistory(taskHistory: HistoryItem[]) {
        const json = JSON.stringify(taskHistory)

        const path = this.getTaskHistoryPath()
        fs.writeFileSync(path, json, "utf-8")
    }

    private getTaskHistoryPath(): string {
        return vscode.Uri.joinPath(this._context.globalStorageUri, "task_history.json").fsPath
    }
}
