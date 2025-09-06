import type {
    CancellationToken,
    DecorationRenderOptions,
    InputBoxOptions,
    Progress,
    ProgressOptions,
    SaveDialogOptions,
    TabGroups,
    TextDocumentShowOptions,
    TextEditor,
    TextEditorDecorationType,
    Event,
    MessageOptions,
    ViewColumn,
    WebviewPanel,
    WebviewOptions,
    WebviewPanelOptions,
    Terminal,
    OpenDialogOptions,
    TerminalOptions,
    TextDocument,
    Thenable,
} from "./types"
import { Uri } from "./uri"

export interface Window {
    /**
     * Represents the grid widget within the main editor area
     */
    readonly tabGroups: TabGroups

    /**
     * The currently active editor or `undefined`. The active editor is the one
     * that currently has focus or, when none has focus, the one that has changed
     * input most recently.
     */
    activeTextEditor: TextEditor | undefined;

    /**
     * The currently visible editors or an empty array.
     */
    visibleTextEditors: readonly TextEditor[]


    /**
     * The currently active terminal or `undefined`. The active terminal is the one that
     * currently has focus or most recently had focus.
     */
    readonly activeTerminal: Terminal | undefined

    /**
     * An {@link Event} which fires when the {@link window.activeTextEditor active editor}
     * has changed. *Note* that the event also fires when the active editor changes
     * to `undefined`.
     */
    readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>

    /**
     * Show an information message to users. Optionally provide an array of items which will be presented as
     * clickable buttons.
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @returns A thenable that resolves to the selected item or `undefined` when being dismissed.
     */
    showInformationMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>

    /**
     * Show an error message.
     *
     * @see {@link window.showInformationMessage showInformationMessage}
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @returns A thenable that resolves to the selected item or `undefined` when being dismissed.
     */
    showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined>

    /**
     * Show a warning message.
     *
     * @see {@link window.showInformationMessage showInformationMessage}
     *
     * @param message The message to show.
     * @param items A set of items that will be rendered as actions in the message.
     * @returns A thenable that resolves to the selected item or `undefined` when being dismissed.
     */
    /**
     * Show a warning message.
     *
     * @see {@link window.showInformationMessage showInformationMessage}
     *
     * @param message The message to show.
     * @param options Configures the behaviour of the message.
     * @param items A set of items that will be rendered as actions in the message.
     * @returns A thenable that resolves to the selected item or `undefined` when being dismissed.
     */
    showWarningMessage(...args:
        [message: string, ...items: string[]]
        | [message: string, options: MessageOptions, ...items: string[]]
    ): Thenable<string | undefined>

    /**
     * Shows a file open dialog to the user which allows to select a file
     * for opening-purposes.
     *
     * @param options Options that control the dialog.
     * @returns A promise that resolves to the selected resources or `undefined`.
     */
    showOpenDialog(options?: OpenDialogOptions): Thenable<Uri[] | undefined>

    /**
     * Opens an input box to ask the user for input.
     *
     * The returned value will be `undefined` if the input box was canceled (e.g. pressing ESC). Otherwise the
     * returned value will be the string typed by the user or an empty string if the user did not type
     * anything but dismissed the input box with OK.
     *
     * @param options Configures the behavior of the input box.
     * @param token A token that can be used to signal cancellation.
     * @returns A promise that resolves to a string the user provided or to `undefined` in case of dismissal.
     */
    showInputBox(options?: InputBoxOptions, token?: CancellationToken): Thenable<string | undefined>

    /**
     * Shows a file save dialog to the user which allows to select a file
     * for saving-purposes.
     *
     * @param options Options that control the dialog.
     * @returns A promise that resolves to the selected resource or `undefined`.
     */
    showSaveDialog(options?: SaveDialogOptions): Thenable<Uri | undefined>


    /**
     * Show the given document in a text editor. A {@link ViewColumn column} can be provided
     * to control where the editor is being shown. Might change the {@link window.activeTextEditor active editor}.
     *
     * @param document A text document to be shown.
     * @param column A view column in which the {@link TextEditor editor} should be shown. The default is the {@link ViewColumn.Active active}.
     * Columns that do not exist will be created as needed up to the maximum of {@linkcode ViewColumn.Nine}. Use {@linkcode ViewColumn.Beside}
     * to open the editor to the side of the currently active one.
     * @param preserveFocus When `true` the editor will not take focus.
     * @returns A promise that resolves to an {@link TextEditor editor}.
     */
    /**
     * A short-hand for `openTextDocument(uri).then(document => showTextDocument(document, options))`.
     *
     * @see {@link workspace.openTextDocument}
     *
     * @param uri A resource identifier.
     * @param options {@link TextDocumentShowOptions Editor options} to configure the behavior of showing the {@link TextEditor editor}.
     * @returns A promise that resolves to an {@link TextEditor editor}.
     */
    showTextDocument(...args: [
        /**
         * A text document to be shown.
         */
        document: TextDocument,
        /**
         * A view column in which the {@link TextEditoreditor} should be shown. The default is the {@link ViewColumn.Activeactive}.
         * Columns that do not exist will be created as needed up to the maximum of {@linkcode ViewColumn.Nine}. Use {@linkcode ViewColumn.Beside}to open the editor to the side of the currently active one.
         */
        column?: ViewColumn,
        /**
         * When `true` the editor will not take focus.
         */
        preserveFocus?: boolean
    ] | [
        /**
         * A text document to be shown.
         */
        document: TextDocument,
        /**
         * {@link TextDocumentShowOptionsEditor options} to configure the behavior of showing the {@link TextEditoreditor}.
         */
        options?: TextDocumentShowOptions
    ] | [
        uri: Uri,
        options?: TextDocumentShowOptions
    ]): Thenable<TextEditor>


    /**
     * Create and show a new webview panel.
     *
     * @param viewType Identifies the type of the webview panel.
     * @param title Title of the panel.
     * @param showOptions Where to show the webview in the editor. If preserveFocus is set, the new webview will not take focus.
     * @param options Settings for the new panel.
     *
     * @returns New webview panel.
     */
    createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel

    /**
     * Create a TextEditorDecorationType that can be used to add decorations to text editors.
     *
     * @param options Rendering options for the decoration type.
     * @returns A new decoration type instance.
     */
    createTextEditorDecorationType(options: DecorationRenderOptions): TextEditorDecorationType

    /**
     * Creates a {@link Terminal} with a backing shell process. The cwd of the terminal will be the workspace
     * directory if it exists.
     *
     * @param name Optional human-readable string which will be used to represent the terminal in the UI.
     * @param shellPath Optional path to a custom shell executable to be used in the terminal.
     * @param shellArgs Optional args for the custom shell executable. A string can be used on Windows only which
     * allows specifying shell args in
     * [command-line format](https://msdn.microsoft.com/en-au/08dfcab2-eb6e-49a4-80eb-87d4076c98c6).
     * @returns A new Terminal.
     * @throws When running in an environment where a new process cannot be started.
     */
    /**
 * Creates a {@link Terminal} with a backing shell process.
 *
 * @param options A TerminalOptions object describing the characteristics of the new terminal.
 * @returns A new Terminal.
 * @throws When running in an environment where a new process cannot be started.
 */
    createTerminal(options: TerminalOptions): Terminal

    /**
     * Show progress in the editor. Progress is shown while running the given callback
     * and while the promise it returned isn't resolved nor rejected. The location at which
     * progress should show (and other details) is defined via the passed {@linkcode ProgressOptions}.
     *
     * @param options A {@linkcode ProgressOptions}-object describing the options to use for showing progress, like its location
     * @param task A callback returning a promise. Progress state can be reported with
     * the provided {@link Progress}-object.
     *
     * To report discrete progress, use `increment` to indicate how much work has been completed. Each call with
     * a `increment` value will be summed up and reflected as overall progress until 100% is reached (a value of
     * e.g. `10` accounts for `10%` of work done).
     * Note that currently only `ProgressLocation.Notification` is capable of showing discrete progress.
     *
     * To monitor if the operation has been cancelled by the user, use the provided {@linkcode CancellationToken}.
     * Note that currently only `ProgressLocation.Notification` is supporting to show a cancel button to cancel the
     * long running operation.
     *
     * @returns The thenable the task-callback returned.
     */
    withProgress<R>(options: ProgressOptions, task: (progress: Progress<{
        /**
         * A progress message that represents a chunk of work
         */
        message?: string;
        /**
         * An increment for discrete progress. Increments will be summed up until 100% is reached
         */
        increment?: number;
    }>, token: CancellationToken) => Thenable<R>): Thenable<R>
}

class WindowProxy implements Window {
    private _window?: Window

    setWindow(window: Window) {
        this._window = window
    }

    get tabGroups(): TabGroups { return this._window!.tabGroups }
    get activeTextEditor(): TextEditor | undefined { return this._window!.activeTextEditor }
    set activeTextEditor(editor: TextEditor | undefined) { this._window!.activeTextEditor = editor }
    get visibleTextEditors(): readonly TextEditor[] { return this._window!.visibleTextEditors }
    set visibleTextEditors(editors: readonly TextEditor[]) { this._window!.visibleTextEditors = editors }
    get activeTerminal(): Terminal | undefined { return this._window!.activeTerminal }
    get onDidChangeActiveTextEditor(): Event<TextEditor | undefined> { return this._window!.onDidChangeActiveTextEditor }
    showInformationMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined> { return this._window!.showInformationMessage(message, ...items) }
    showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined> { return this._window!.showErrorMessage(message, ...items) }
    showWarningMessage(...args:
        [message: string, ...items: string[]] |
        [message: string, options: MessageOptions, ...items: string[]]): Thenable<string | undefined> { return this._window!.showWarningMessage(...args) }
    showOpenDialog(options?: OpenDialogOptions): Thenable<Uri[] | undefined> { return this._window!.showOpenDialog(options) }
    showInputBox(options?: InputBoxOptions, token?: CancellationToken): Thenable<string | undefined> { return this._window!.showInputBox(options, token) }
    showSaveDialog(options?: SaveDialogOptions): Thenable<Uri | undefined> { return this._window!.showSaveDialog(options) }
    showTextDocument(...args: [
        document: TextDocument,
        column?: ViewColumn,
        preserveFocus?: boolean
    ] | [
        document: TextDocument,
        options?: TextDocumentShowOptions
    ] | [
        uri: Uri,
        options?: TextDocumentShowOptions
    ]): Thenable<TextEditor> { return this._window!.showTextDocument(...args) }
    createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel { return this._window!.createWebviewPanel(viewType, title, showOptions, options) }
    createTextEditorDecorationType(options: DecorationRenderOptions): TextEditorDecorationType { return this._window!.createTextEditorDecorationType(options) }
    createTerminal(options: TerminalOptions): Terminal { return this._window!.createTerminal(options) }
    withProgress<R>(options: ProgressOptions, task: (progress: Progress<{
        message?: string;
        increment?: number;
    }>, token: CancellationToken) => Thenable<R>): Thenable<R> { return this._window!.withProgress(options, task) }
}

/**
 * Namespace for dealing with the current window of the editor. That is visible
 * and active editors, as well as, UI elements to show messages, selections, and
 * asking for user input.
 */
export const window = new WindowProxy()
