import type { Clipboard } from "./types"
import { Uri } from "./uri"

export interface Env {
    /**
     * The application root folder from which the editor is running.
     *
     * *Note* that the value is the empty string when running in an
     * environment that has no representation of an application root folder.
     */
    readonly appRoot: string

    /**
     * The system clipboard.
     */
    readonly clipboard: Clipboard

    /**
     * The custom uri scheme the editor registers to in the operating system.
     */
    readonly uriScheme: string

    /**
     * A unique identifier for the computer.
     */
    readonly machineId: string

    /**
     * Opens a link externally using the default application. Depending on the
     * used scheme this can be:
     * * a browser (`http:`, `https:`)
     * * a mail client (`mailto:`)
     * * VSCode itself (`vscode:` from `vscode.env.uriScheme`)
     *
     * *Note* that {@linkcode window.showTextDocument showTextDocument} is the right
     * way to open a text document inside the editor, not this function.
     *
     * @param target The uri that should be opened.
     * @returns A promise indicating if open was successful.
     */
    openExternal(target: Uri): Thenable<boolean>
}

class EnvProxy implements Env {
    private _env?: Env

    setEnv(env: Env) {
        this._env = env
    }

    get appRoot(): string { return this._env!.appRoot }
    get clipboard(): Clipboard { return this._env!.clipboard }
    get uriScheme(): string { return this._env!.uriScheme }
    get machineId(): string { return this._env!.machineId }
    openExternal(target: Uri): Thenable<boolean> { return this._env!.openExternal(target) }
}

export const env = new EnvProxy()
