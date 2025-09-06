import { Env, Uri, Clipboard } from "vscode-interface"

/**
 * Namespace describing the environment the editor runs in.
 */
export class EnvImpl implements Env {
    readonly appRoot: string = ""
    readonly clipboard: Clipboard = new NullCipboard()
    readonly uriScheme: string = ''
    readonly machineId: string = ''

    openExternal(target: Uri): Thenable<boolean> {
        // not supported
        return Promise.resolve(false);
    }
}

class NullCipboard implements Clipboard {
    readText(): Promise<string> {
        // do nothing
        return Promise.resolve("");
    }

    writeText(value: string): Promise<void> {
        // do nothing
        return Promise.resolve();
    }
}
