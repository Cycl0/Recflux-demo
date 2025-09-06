import { Commands, Disposable } from "vscode-interface"


export class CommandsImpl implements Commands {
    private _commands: Record<string, (...args: any[]) => any> = {}

    /**
     * Registers a command that can be invoked via a keyboard shortcut,
     * a menu item, an action, or directly.
     *
     * Registering a command with an existing command identifier twice
     * will cause an error.
     *
     * @param command A unique identifier for the command.
     * @param callback A command handler function.
     * @param thisArg The `this` context used when invoking the handler function.
     * @returns Disposable which unregisters this command on disposal.
     */
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
        if (this._commands[command]) {
            throw new Error("Already registered command: " + command)
        }

        if (thisArg) {
            callback = callback.bind(thisArg)
        }

        this._commands[command] = callback

        return new Disposable(() => {
            delete this._commands[command]
        })
    }

    /**
     * Executes the command denoted by the given command identifier.
     *
     * * *Note 1:* When executing an editor command not all types are allowed to
     * be passed as arguments. Allowed are the primitive types `string`, `boolean`,
     * `number`, `undefined`, and `null`, as well as {@linkcode Position}, {@linkcode Range}, {@linkcode Uri} and {@linkcode Location}.
     * * *Note 2:* There are no restrictions when executing commands that have been contributed
     * by extensions.
     *
     * @param command Identifier of the command to execute.
     * @param rest Parameters passed to the command function.
     * @returns A thenable that resolves to the returned value of the given command. Returns `undefined` when
     * the command handler function doesn't return anything.
     */
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T> {
        if (!this._commands[command]) {
            return Promise.resolve(undefined as T)
        }

        const result = this._commands[command](...rest)
        return Promise.resolve(result as T)
    }
}
