import { Disposable } from "./disposable"

export interface Commands {
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
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable

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
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T>
}

export class CommandsProxy implements Commands {
    private _commands?: Commands

    setCommands(commands: Commands) {
        this._commands = commands
    }

    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable { return this._commands!.registerCommand(command, callback, thisArg) }
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T> { return this._commands!.executeCommand(command, ...rest) }
}


/**
 * Namespace for dealing with commands. In short, a command is a function with a
 * unique identifier. The function is sometimes also called _command handler_.
 *
 * Commands can be added to the editor using the {@link commands.registerCommand registerCommand}
 * and {@link commands.registerTextEditorCommand registerTextEditorCommand} functions. Commands
 * can be executed {@link commands.executeCommand manually} or from a UI gesture. Those are:
 *
 * * palette - Use the `commands`-section in `package.json` to make a command show in
 * the [command palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).
 * * keybinding - Use the `keybindings`-section in `package.json` to enable
 * [keybindings](https://code.visualstudio.com/docs/getstarted/keybindings#_advanced-customization)
 * for your extension.
 *
 * Commands from other extensions and from the editor itself are accessible to an extension. However,
 * when invoking an editor command not all argument types are supported.
 *
 * This is a sample that registers a command handler and adds an entry for that command to the palette. First
 * register a command handler with the identifier `extension.sayHello`.
 * ```javascript
 * commands.registerCommand('extension.sayHello', () => {
 * 	window.showInformationMessage('Hello World!');
 * });
 * ```
 * Second, bind the command identifier to a title under which it will show in the palette (`package.json`).
 * ```json
 * {
 * 	"contributes": {
 * 		"commands": [{
 * 			"command": "extension.sayHello",
 * 			"title": "Hello World"
 * 		}]
 * 	}
 * }
 * ```
 */
export const commands = new CommandsProxy()
