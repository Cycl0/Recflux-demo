import * as vscode from "vscode-interface"
import * as fs from "fs"
import { console } from "./setup"
import defaultSettings from "./default_settings.json"
import path from "path"
import { ExtensionContextImpl } from "./extensionContextImpl"
import { ensureSettingsDirectoryExists, GlobalFileNames } from "cline/core/storage/disk"

export type Settings = {
    globalState: Record<string, any>
    settings: Record<string, any>
}

export function loadSettings(settingsPath: vscode.Uri): Settings {
    try {
        const settingsStr = fs.readFileSync(settingsPath.fsPath, "utf-8")
        const json = JSON.parse(settingsStr)

        let globalState: Record<string, any> = {}
        if (typeof json.globalState === "object" && json.globalState !== null) {
            globalState = json.globalState
        }

        let settings: Record<string, any> = {}
        if (typeof json.settings === "object" && json.settings !== null) {
            settings = json.settings
        }

        return {
            globalState,
            settings,
        }
    }
    catch (error) {
        console.error(error)

        return {
            globalState: {},
            settings: {},
        }
    }
}

export function initSettings(settingsPath: vscode.Uri) {
    try {
        if (fs.existsSync(settingsPath.fsPath)) {
            return
        }

        const dir = path.dirname(settingsPath.fsPath)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(settingsPath.fsPath, JSON.stringify(defaultSettings, null, 4))
        console.log(`Settings file created at ${settingsPath.fsPath}`)
    }
    catch (error) {
        console.error(error)
    }
}

export async function initMcpSettings(storagePath: vscode.Uri): Promise<string> {
    try {
        const context = new ExtensionContextImpl(storagePath)
        const clineSettingsPath = await ensureSettingsDirectoryExists(context)
        const mcpSettingsPath = path.join(clineSettingsPath, GlobalFileNames.mcpSettings)

        await ensureSettingsDirectoryExists(context)
        if (fs.existsSync(mcpSettingsPath)) {
            return mcpSettingsPath
        }

        const dir = path.dirname(mcpSettingsPath)
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(
            mcpSettingsPath,
            `{
  "mcpServers": {
    
  }
}`,
        )
        console.log(`MCP settings file created at ${mcpSettingsPath}`)

		return mcpSettingsPath
    }
    catch (error) {
        console.error(error)
        return ""
    }
}
