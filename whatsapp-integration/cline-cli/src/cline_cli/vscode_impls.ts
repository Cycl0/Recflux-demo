import * as vscode from "vscode-interface"
import { WorkspaceImpl } from "./workspaceImpl"
import { DebugImpl } from "./debugImpl"
import { EnvImpl } from "./envImpl"
import { LanguagesImpl } from "./languagesImpl"
import { WindowImpl } from "./windowImpl"
import { CommandsImpl } from "./commandsImpl"

export type VsCodeImplOptions = {
    workspacePath: vscode.Uri,
    visibleFiles: string[],
}

export function createVsCodeImpls(options: VsCodeImplOptions) {
    const workspace = new WorkspaceImpl()
    const workspaceFolder: vscode.WorkspaceFolder = {
        uri: options.workspacePath,
    }
    workspace.setWorkspaceFolder(workspaceFolder)

    const debug = new DebugImpl()
    const env = new EnvImpl()
    const languages = new LanguagesImpl()
    const window = new WindowImpl(workspace, {
        visibleFiles: options.visibleFiles,
    })
    const commands = new CommandsImpl()

    window.registerCommands(commands)

    return {
        workspace,
        debug,
        env,
        languages,
        window,
        commands,
    }
}
