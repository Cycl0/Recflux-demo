import * as vscode from "vscode-interface"
import * as os from "os"
import { program, OptionValues } from "commander"
import path from "path"
import { expandPath } from "./pathUtil"
import { createVsCodeImpls } from "./vscode_impls"
import * as console from "./console"
export { console }

enum CommandType {
    Unknown,
    Init,
    Task,
}

export type InitCommandOptions = {
    settings: vscode.Uri
    storage: vscode.Uri
}

export type TaskCommandOptions = {
    settings: vscode.Uri
    storage: vscode.Uri
    task?: string
    customInstructions?: string
    autoApproveMcp: boolean
    fullAuto: boolean
    resume: boolean
    resumeOrNew: boolean
}

type CommandHandlers = {
    init: (options: InitCommandOptions) => Promise<void>,
    task: (options: TaskCommandOptions) => Promise<void>,
}

let commandType: CommandType = CommandType.Unknown
let executeCommandImpl: (handlers: CommandHandlers) => Promise<void> = async () => { }
export let vsCodeImpls: ReturnType<typeof createVsCodeImpls>

program
    .description("Command Line Interface for Cline AI Assistant")
    .version("0.0.1")

program
    .command("init")
    .description("Initialize Cline CLI with default settings")
    .option("--settings <path>", "Path to the settings file", "~/.cline_cli/cline_cli_settings.json")
    .option("--storage <path>", "Path to the storage folder", "~/.cline_cli/storage")
    .action((opts: OptionValues) => {
        commandType = CommandType.Init

        const initCommandOptions = {
            settings: getSettingsPath(opts.settings),
            storage: getStoragePath(opts.storage),
        }

        vsCodeImpls = setupVsCode(getWorkspacePath(undefined), [])

        executeCommandImpl = (handlers: CommandHandlers) => {
            return handlers.init(initCommandOptions)
        }
    })

program
    .command("task")
    .description("Execute a task with Cline AI assistant")
    .argument("[task]", "Task to start, or input from standard input if not specified")
    .option("--settings <path>", "Path to the settings file", "~/.cline_cli/cline_cli_settings.json")
    .option("--workspace <path>", "Path to the workspace folder")
    .option("--storage <path>", "Path to the storage folder", "~/.cline_cli/storage")
    .option("--custom-instructions <string>", "provide custom instructions for the AI assistant")
    .option("--visible-files <string...>", "specify files that should be visible to the AI assistant")
    .option("--full-auto", "automatically respond to requests from the AI assistant")
    .option("--auto-approve-mcp", "automatically approve all MCP tool usage requests, including those that normally require explicit confirmation")
    .option("--resume", "resume an existing incomplete task")
    .option("--resume-or-new", "resume an existing incomplete task if one exists, otherwise create a new task")
    .action((task: string | undefined, opts: OptionValues) => {
        commandType = CommandType.Task

        const taskCommandOptions = {
            settings: getSettingsPath(opts.settings),
            storage: getStoragePath(opts.storage),
            task: task,
            customInstructions: opts.customInstructions,
            autoApproveMcp: !!opts.autoApproveMcp,
            fullAuto: !!opts.fullAuto,
            resume: !!opts.resume,
            resumeOrNew: !!opts.resumeOrNew,
        }

        vsCodeImpls = setupVsCode(getWorkspacePath(opts.workspace), opts.visibleFiles || [])

        executeCommandImpl = (handlers: CommandHandlers) => {
            return handlers.task(taskCommandOptions)
        }
    })

function getSettingsPath(settings?: string): vscode.Uri {
    if (settings) {
        return vscode.Uri.file(expandPath(settings))
    }

    return vscode.Uri.file(path.join(os.homedir(), ".cline_cli", "cline_cli_settings.json"))
}

function getStoragePath(storage?: string): vscode.Uri {
    if (storage) {
        return vscode.Uri.file(expandPath(storage))
    }

    return vscode.Uri.file(path.join(os.homedir(), ".cline_cli", "storage"))
}

function getWorkspacePath(workspace?: string): vscode.Uri {
    if (workspace) {
        return vscode.Uri.file(expandPath(workspace))
    }

    return vscode.Uri.file(process.cwd())
}

function setupVsCode(workspacePath: vscode.Uri, visibleFiles: string[]) {
    const vsCodeImpls = createVsCodeImpls({
        workspacePath: workspacePath,
        visibleFiles: visibleFiles,
    })

    vscode.workspace.setWorkspace(vsCodeImpls.workspace)
    vscode.debug.setDebug(vsCodeImpls.debug)
    vscode.env.setEnv(vsCodeImpls.env)
    vscode.languages.setLanguages(vsCodeImpls.languages)
    vscode.window.setWindow(vsCodeImpls.window)
    vscode.commands.setCommands(vsCodeImpls.commands)

    return vsCodeImpls
}

program.parse()

console.setIgnore(true)

export function executeCommand(handlers: CommandHandlers) {
    return executeCommandImpl(handlers)
}
