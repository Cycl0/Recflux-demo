import type { Position } from "./position"
import type { Range, Selection } from "./range"
import type { ThemeIcon } from "./theme"
import type { Uri } from "./uri"
import type { Disposable } from "./disposable"
import type { TabInputText, TabInputTextDiff } from "./tabInput"
import type { RelativePattern } from "./relativePattern"
import type { Diagnostic } from "./diagnostic"
import type { CodeAction, CodeActionKind } from "./codeAction"

/**
 * Represents a reference to a command. Provides a title which
 * will be used to represent a command in the UI and, optionally,
 * an array of arguments which will be passed to the command handler
 * function when invoked.
 */
export interface Command {
    /**
     * Title of the command, like `save`.
     */
    title: string;

    /**
     * The identifier of the actual command handler.
     * @see {@link commands.registerCommand}
     */
    command: string;

    /**
     * Arguments that the command handler should be
     * invoked with.
     */
    arguments?: any[];
}

/**
 * A file system watcher notifies about changes to files and folders
 * on disk or from other {@link FileSystemProvider FileSystemProviders}.
 *
 * To get an instance of a `FileSystemWatcher` use
 * {@link workspace.createFileSystemWatcher createFileSystemWatcher}.
 */
export interface FileSystemWatcher extends Disposable {
    /**
     * An event which fires on file/folder creation.
     */
    readonly onDidCreate: Event<Uri>;

    /**
     * An event which fires on file/folder change.
     */
    readonly onDidChange: Event<Uri>;

    /**
     * An event which fires on file/folder deletion.
     */
    readonly onDidDelete: Event<Uri>;
}

/**
 * A text document content provider allows to add readonly documents
 * to the editor, such as source from a dll or generated html from md.
 *
 * Content providers are {@link workspace.registerTextDocumentContentProvider registered}
 * for a {@link Uri.scheme uri-scheme}. When a uri with that scheme is to
 * be {@link workspace.openTextDocument loaded} the content provider is
 * asked.
 */
export interface TextDocumentContentProvider {
    /**
     * Provide textual content for a given uri.
     *
     * The editor will use the returned string-content to create a readonly
     * {@link TextDocument document}. Resources allocated should be released when
     * the corresponding document has been {@link workspace.onDidCloseTextDocument closed}.
     *
     * **Note**: The contents of the created {@link TextDocument document} might not be
     * identical to the provided text due to end-of-line-sequence normalization.
     *
     * @param uri An uri which scheme matches the scheme this provider was {@link workspace.registerTextDocumentContentProvider registered} for.
     * @param token A cancellation token.
     * @returns A string or a thenable that resolves to such.
     */
    provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string>;
}


/**
 * Represents a text document, such as a source file. Text documents have
 * {@link TextLine lines} and knowledge about an underlying resource like a file.
 */
export interface TextDocument {

    /**
     * The associated uri for this document.
     *
     * *Note* that most documents use the `file`-scheme, which means they are files on disk. However, **not** all documents are
     * saved on disk and therefore the `scheme` must be checked before trying to access the underlying file or siblings on disk.
     *
     * @see {@link FileSystemProvider}
     * @see {@link TextDocumentContentProvider}
     */
    readonly uri: Uri;

    /**
     * The identifier of the language associated with this document.
     */
    readonly languageId: string;

    /**
     * `true` if there are unpersisted changes.
     */
    readonly isDirty: boolean;

    /**
     * Save the underlying file.
     *
     * @returns A promise that will resolve to `true` when the file
     * has been saved. If the save failed, will return `false`.
     */
    save(): Thenable<boolean>;

    /**
     * The number of lines in this document.
     */
    readonly lineCount: number;

    /**
     * Returns a text line denoted by the line number. Note
     * that the returned object is *not* live and changes to the
     * document are not reflected.
     *
     * @param line A line number in `[0, lineCount)`.
     * @returns A {@link TextLine line}.
     */
    lineAt(line: number): TextLine;


    /**
     * Converts a zero-based offset to a position.
     *
     * @param offset A zero-based offset into the document. This offset is in UTF-16 [code units](https://developer.mozilla.org/en-US/docs/Glossary/Code_unit).
     * @returns A valid {@link Position}.
     */
    positionAt(offset: number): Position;

    /**
     * Get the text of this document. A substring can be retrieved by providing
     * a range. The range will be {@link TextDocument.validateRange adjusted}.
     *
     * @param range Include only the text included by the range.
     * @returns The text inside the provided range or the entire text.
     */
    getText(range?: Range): string;
}

/**
 * Represents a line of text, such as a line of source code.
 *
 * TextLine objects are __immutable__. When a {@link TextDocument document} changes,
 * previously retrieved lines will not represent the latest state.
 */
export interface TextLine {
    /**
     * The text of this line without the line separator characters.
     */
    readonly text: string;
}

/**
 * Rendering style of the cursor.
 */
export enum TextEditorCursorStyle {
    /**
     * Render the cursor as a vertical thick line.
     */
    Line = 1,
    /**
     * Render the cursor as a block filled.
     */
    Block = 2,
    /**
     * Render the cursor as a thick horizontal line.
     */
    Underline = 3,
    /**
     * Render the cursor as a vertical thin line.
     */
    LineThin = 4,
    /**
     * Render the cursor as a block outlined.
     */
    BlockOutline = 5,
    /**
     * Render the cursor as a thin horizontal line.
     */
    UnderlineThin = 6
}

/**
 * Rendering style of the line numbers.
 */
export enum TextEditorLineNumbersStyle {
    /**
     * Do not render the line numbers.
     */
    Off = 0,
    /**
     * Render the line numbers.
     */
    On = 1,
    /**
     * Render the line numbers with values relative to the primary cursor location.
     */
    Relative = 2,
    /**
     * Render the line numbers on every 10th line number.
     */
    Interval = 3,
}

/**
 * Represents an icon in the UI. This is either an uri, separate uris for the light- and dark-themes,
 * or a {@link ThemeIcon theme icon}.
 */
export type IconPath = Uri | ThemeIcon;

/**
 * Represents a handle to a set of decorations
 * sharing the same {@link DecorationRenderOptions styling options} in a {@link TextEditor text editor}.
 *
 * To get an instance of a `TextEditorDecorationType` use
 * {@link window.createTextEditorDecorationType createTextEditorDecorationType}.
 */
export interface TextEditorDecorationType {
}

/**
 * Represents different {@link TextEditor.revealRange reveal} strategies in a text editor.
 */
export enum TextEditorRevealType {
    /**
     * The range will be revealed with as little scrolling as possible.
     */
    Default = 0,
    /**
     * The range will always be revealed in the center of the viewport.
     */
    InCenter = 1,
    /**
     * If the range is outside the viewport, it will be revealed in the center of the viewport.
     * Otherwise, it will be revealed with as little scrolling as possible.
     */
    InCenterIfOutsideViewport = 2,
    /**
     * The range will always be revealed at the top of the viewport.
     */
    AtTop = 3
}

/**
 * Represents an editor that is attached to a {@link TextDocument document}.
 */
export interface TextEditor {

    /**
     * The document associated with this text editor. The document will be the same for the entire lifetime of this text editor.
     */
    readonly document: TextDocument;

    /**
     * The primary selection on this text editor. Shorthand for `TextEditor.selections[0]`.
     */
    selection: Selection;

    /**
     * The column in which this editor shows. Will be `undefined` in case this
     * isn't one of the main editors, e.g. an embedded editor, or when the editor
     * column is larger than three.
     */
    readonly viewColumn: ViewColumn | undefined;

    /**
     * Adds a set of decorations to the text editor. If a set of decorations already exists with
     * the given {@link TextEditorDecorationType decoration type}, they will be replaced. If
     * `rangesOrOptions` is empty, the existing decorations with the given {@link TextEditorDecorationType decoration type}
     * will be removed.
     *
     * @see {@link window.createTextEditorDecorationType createTextEditorDecorationType}.
     *
     * @param decorationType A decoration type.
     * @param rangesOrOptions Either {@link Range ranges} or more detailed {@link DecorationOptions options}.
     */
    setDecorations(decorationType: TextEditorDecorationType, rangesOrOptions: readonly Range[]): void;

    /**
     * Scroll as indicated by `revealType` in order to reveal the given range.
     *
     * @param range A range.
     * @param revealType The scrolling strategy for revealing `range`.
     */
    revealRange(range: Range, revealType?: TextEditorRevealType): void;
}

/**
 * A file glob pattern to match file paths against. This can either be a glob pattern string
 * (like `**​/*.{ts,js}` or `*.{ts,js}`) or a {@link RelativePattern relative pattern}.
 *
 * Glob patterns can have the following syntax:
 * * `*` to match zero or more characters in a path segment
 * * `?` to match on one character in a path segment
 * * `**` to match any number of path segments, including none
 * * `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
 * * `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
 * * `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
 *
 * Note: a backslash (`\`) is not valid within a glob pattern. If you have an existing file
 * path to match against, consider to use the {@link RelativePattern relative pattern} support
 * that takes care of converting any backslash into slash. Otherwise, make sure to convert
 * any backslash to slash when creating the glob pattern.
 */
export type GlobPattern = string | RelativePattern;

/**
 * Represents the configuration. It is a merged view of
 *
 * - *Default Settings*
 * - *Global (User) Settings*
 * - *Workspace settings*
 * - *Workspace Folder settings* - From one of the {@link workspace.workspaceFolders Workspace Folders} under which requested resource belongs to.
 * - *Language settings* - Settings defined under requested language.
 *
 * The *effective* value (returned by {@linkcode WorkspaceConfiguration.get get}) is computed by overriding or merging the values in the following order:
 *
 * 1. `defaultValue` (if defined in `package.json` otherwise derived from the value's type)
 * 1. `globalValue` (if defined)
 * 1. `workspaceValue` (if defined)
 * 1. `workspaceFolderValue` (if defined)
 * 1. `defaultLanguageValue` (if defined)
 * 1. `globalLanguageValue` (if defined)
 * 1. `workspaceLanguageValue` (if defined)
 * 1. `workspaceFolderLanguageValue` (if defined)
 *
 * **Note:** Only `object` value types are merged and all other value types are overridden.
 *
 * Example 1: Overriding
 *
 * ```ts
 * defaultValue = 'on';
 * globalValue = 'relative'
 * workspaceFolderValue = 'off'
 * value = 'off'
 * ```
 *
 * Example 2: Language Values
 *
 * ```ts
 * defaultValue = 'on';
 * globalValue = 'relative'
 * workspaceFolderValue = 'off'
 * globalLanguageValue = 'on'
 * value = 'on'
 * ```
 *
 * Example 3: Object Values
 *
 * ```ts
 * defaultValue = { "a": 1, "b": 2 };
 * globalValue = { "b": 3, "c": 4 };
 * value = { "a": 1, "b": 3, "c": 4 };
 * ```
 *
 * *Note:* Workspace and Workspace Folder configurations contains `launch` and `tasks` settings. Their basename will be
 * part of the section identifier. The following snippets shows how to retrieve all configurations
 * from `launch.json`:
 *
 * ```ts
 * // launch.json configuration
 * const config = workspace.getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri);
 *
 * // retrieve values
 * const values = config.get('configurations');
 * ```
 *
 * Refer to [Settings](https://code.visualstudio.com/docs/getstarted/settings) for more information.
 */
export interface WorkspaceConfiguration {

    /**
     * Return a value from this configuration.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @param defaultValue A value should be returned when no value could be found, is `undefined`.
     * @returns The value `section` denotes or the default.
     */
    get<T>(section: string, defaultValue?: T): T;
}

/**
 * The configuration target
 */
export enum ConfigurationTarget {
    /**
     * Global configuration
     */
    Global = 1,

    /**
     * Workspace configuration
     */
    Workspace = 2,

    /**
     * Workspace folder configuration
     */
    WorkspaceFolder = 3
}

/**
 * Defines a generalized way of reporting progress updates.
 */
export interface Progress<T> {

    /**
     * Report a progress update.
     * @param value A progress item, like a message and/or an
     * report on how much work finished
     */
    report(value: T): void;
}

/**
 * An individual terminal instance within the integrated terminal.
 */
export interface Terminal {

    /**
     * The name of the terminal.
     */
    readonly name: string;

    /**
     * The exit status of the terminal, this will be undefined while the terminal is active.
     *
     * **Example:** Show a notification with the exit code when the terminal exits with a
     * non-zero exit code.
     * ```typescript
     * window.onDidCloseTerminal(t => {
     *   if (t.exitStatus && t.exitStatus.code) {
     *   	vscode.window.showInformationMessage(`Exit code: ${t.exitStatus.code}`);
     *   }
     * });
     * ```
     */
    readonly exitStatus: TerminalExitStatus | undefined;

    /**
     * An object that contains [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration)-powered
     * features for the terminal. This will always be `undefined` immediately after the terminal
     * is created. Listen to {@link window.onDidChangeTerminalShellIntegration} to be notified
     * when shell integration is activated for a terminal.
     *
     * Note that this object may remain undefined if shell integration never activates. For
     * example Command Prompt does not support shell integration and a user's shell setup could
     * conflict with the automatic shell integration activation.
     */
    readonly shellIntegration: TerminalShellIntegration | undefined;

    /**
     * Send text to the terminal. The text is written to the stdin of the underlying pty process
     * (shell) of the terminal.
     *
     * @param text The text to send.
     * @param shouldExecute Indicates that the text being sent should be executed rather than just inserted in the terminal.
     * The character(s) added are `\n` or `\r\n`, depending on the platform. This defaults to `true`.
     */
    sendText(text: string, shouldExecute?: boolean): void;

    /**
     * Show the terminal panel and reveal this terminal in the UI.
     *
     * @param preserveFocus When `true` the terminal will not take focus.
     */
    show(preserveFocus?: boolean): void;

    /**
     * Dispose and free associated resources.
     */
    dispose(): void;
}

/**
 * Value-object describing what options a terminal should use.
 */
export interface TerminalOptions {
    /**
     * A human-readable string which will be used to represent the terminal in the UI.
     */
    name?: string;

    /**
     * A path or Uri for the current working directory to be used for the terminal.
     */
    cwd?: string | Uri;

    /**
     * The icon path or {@link ThemeIcon} for the terminal.
     */
    iconPath?: IconPath;
}

/**
 * [Shell integration](https://code.visualstudio.com/docs/terminal/shell-integration)-powered capabilities owned by a terminal.
 */
export interface TerminalShellIntegration {
    /**
     * The current working directory of the terminal. This {@link Uri} may represent a file on
     * another machine (eg. ssh into another machine). This requires the shell integration to
     * support working directory reporting.
     */
    readonly cwd: Uri | undefined;

    /**
     * Execute a command, sending ^C as necessary to interrupt any running command if needed.
     *
     * @param commandLine The command line to execute, this is the exact text that will be sent
     * to the terminal.
     *
     * @example
     * // Execute a command in a terminal immediately after being created
     * const myTerm = window.createTerminal();
     * window.onDidChangeTerminalShellIntegration(async ({ terminal, shellIntegration }) => {
     *   if (terminal === myTerm) {
     *     const execution = shellIntegration.executeCommand('echo "Hello world"');
     *     window.onDidEndTerminalShellExecution(event => {
     *       if (event.execution === execution) {
     *         console.log(`Command exited with code ${event.exitCode}`);
     *       }
     *     });
     *   }
     * }));
     * // Fallback to sendText if there is no shell integration within 3 seconds of launching
     * setTimeout(() => {
     *   if (!myTerm.shellIntegration) {
     *     myTerm.sendText('echo "Hello world"');
     *     // Without shell integration, we can't know when the command has finished or what the
     *     // exit code was.
     *   }
     * }, 3000);
     *
     * @example
     * // Send command to terminal that has been alive for a while
     * const commandLine = 'echo "Hello world"';
     * if (term.shellIntegration) {
     *   const execution = shellIntegration.executeCommand({ commandLine });
     *   window.onDidEndTerminalShellExecution(event => {
     *     if (event.execution === execution) {
     *       console.log(`Command exited with code ${event.exitCode}`);
     *     }
     *   });
     * } else {
     *   term.sendText(commandLine);
     *   // Without shell integration, we can't know when the command has finished or what the
     *   // exit code was.
     * }
     */
    executeCommand(commandLine: string): TerminalShellExecution;
}

/**
 * A command that was executed in a terminal.
 */
export interface TerminalShellExecution {
    /**
     * Creates a stream of raw data (including escape sequences) that is written to the
     * terminal. This will only include data that was written after `read` was called for
     * the first time, ie. you must call `read` immediately after the command is executed via
     * {@link TerminalShellIntegration.executeCommand} or
     * {@link window.onDidStartTerminalShellExecution} to not miss any data.
     *
     * @example
     * // Log all data written to the terminal for a command
     * const command = term.shellIntegration.executeCommand({ commandLine: 'echo "Hello world"' });
     * const stream = command.read();
     * for await (const data of stream) {
     *   console.log(data);
     * }
     */
    read(): AsyncIterable<string>;
}

/**
 * Represents how a terminal exited.
 */
export interface TerminalExitStatus {
}

/**
 * Represents a typed event.
 *
 * A function that represents an event to which you subscribe by calling it with
 * a listener function as argument.
 *
 * @example
 * item.onDidChange(function(event) { console.log("Event happened: " + event); });
 */
export interface Event<T> {

    /**
     * A function that represents an event to which you subscribe by calling it with
     * a listener function as argument.
     *
     * @param listener The listener function will be called when the event happens.
     * @param thisArgs The `this`-argument which will be used when calling the event listener.
     * @param disposables An array to which a {@link Disposable} will be added.
     * @returns A disposable which unsubscribes the event listener.
     */
    (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
}


/**
 * A cancellation token is passed to an asynchronous or long running
 * operation to request cancellation, like cancelling a request
 * for completion items because the user continued to type.
 *
 * To get an instance of a `CancellationToken` use a
 * {@link CancellationTokenSource}.
 */
export interface CancellationToken {

    /**
     * Is `true` when the token has been cancelled, `false` otherwise.
     */
    isCancellationRequested: boolean;

    /**
     * An {@link Event} which fires upon cancellation.
     */
    onCancellationRequested: Event<any>;
}

/**
 * Options to configure the behavior of the input box UI.
 */
export interface InputBoxOptions {

    /**
     * An optional string that represents the title of the input box.
     */
    title?: string;

    /**
     * The value to pre-fill in the input box.
     */
    value?: string;

    /**
     * The text to display underneath the input box.
     */
    prompt?: string;
}


/**
 * Represents an extension.
 *
 * To get an instance of an `Extension` use {@link extensions.getExtension getExtension}.
 */
export interface Extension<T> {

    /**
     * The canonical extension identifier in the form of: `publisher.name`.
     */
    readonly id: string;

    /**
     * The uri of the directory containing the extension.
     */
    readonly extensionUri: Uri;

    /**
     * The absolute file path of the directory containing this extension. Shorthand
     * notation for {@link Extension.extensionUri Extension.extensionUri.fsPath} (independent of the uri scheme).
     */
    readonly extensionPath: string;

    /**
     * `true` if the extension has been activated.
     */
    readonly isActive: boolean;

    /**
     * The parsed contents of the extension's package.json.
     */
    readonly packageJSON: any;

    /**
     * The public API exported by this extension (return value of `activate`).
     * It is an invalid action to access this field before this extension has been activated.
     */
    readonly exports: T;
}

/**
 * The ExtensionMode is provided on the `ExtensionContext` and indicates the
 * mode the specific extension is running in.
 */
export enum ExtensionMode {
    /**
     * The extension is installed normally (for example, from the marketplace
     * or VSIX) in the editor.
     */
    Production = 1,

    /**
     * The extension is running from an `--extensionDevelopmentPath` provided
     * when launching the editor.
     */
    Development = 2,

    /**
     * The extension is running from an `--extensionTestsPath` and
     * the extension host is running unit tests.
     */
    Test = 3,
}

/**
 * An extension context is a collection of utilities private to an
 * extension.
 *
 * An instance of an `ExtensionContext` is provided as the first
 * parameter to the `activate`-call of an extension.
 */
export interface ExtensionContext {

    /**
     * An array to which disposables can be added. When this
     * extension is deactivated the disposables will be disposed.
     *
     * *Note* that asynchronous dispose-functions aren't awaited.
     */
    readonly subscriptions: {
        /**
         * Function to clean up resources.
         */
        dispose(): any;
    }[];

    /**
     * A memento object that stores state in the context
     * of the currently opened {@link workspace.workspaceFolders workspace}.
     */
    readonly workspaceState: Memento;

    /**
     * A memento object that stores state independent
     * of the current opened {@link workspace.workspaceFolders workspace}.
     */
    readonly globalState: Memento;

    /**
     * A secret storage object that stores state independent
     * of the current opened {@link workspace.workspaceFolders workspace}.
     */
    readonly secrets: SecretStorage;

    /**
     * The uri of the directory containing the extension.
     */
    readonly extensionUri: Uri;

    /**
     * The uri of a directory in which the extension can store global state.
     * The directory might not exist on disk and creation is
     * up to the extension. However, the parent directory is guaranteed to be existent.
     *
     * Use {@linkcode ExtensionContext.globalState globalState} to store key value data.
     *
     * @see {@linkcode FileSystem workspace.fs} for how to read and write files and folders from
     *  an uri.
     */
    readonly globalStorageUri: Uri;

    /**
     * The mode the extension is running in. See {@link ExtensionMode}
     * for possible values and scenarios.
     */
    readonly extensionMode: ExtensionMode;

    /**
     * The current `Extension` instance.
     */
    readonly extension?: Extension<any>;
}

/**
 * A memento represents a storage utility. It can store and retrieve
 * values.
 */
export interface Memento {

    /**
     * Returns the stored keys.
     *
     * @returns The stored keys.
     */
    keys(): readonly string[];

    /**
     * Return a value.
     *
     * @param key A string.
     * @returns The stored value or `undefined`.
     */
    get<T>(key: string): T | undefined;

    /**
     * Return a value.
     *
     * @param key A string.
     * @param defaultValue A value that should be returned when there is no
     * value (`undefined`) with the given key.
     * @returns The stored value or the defaultValue.
     */
    get<T>(key: string, defaultValue: T): T;

    /**
     * Store a value. The value must be JSON-stringifyable.
     *
     * *Note* that using `undefined` as value removes the key from the underlying
     * storage.
     *
     * @param key A string.
     * @param value A value. MUST not contain cyclic references.
     */
    update(key: string, value: any): Thenable<void>;
}

/**
 * Represents a storage utility for secrets (or any information that is sensitive)
 * that will be stored encrypted. The implementation of the secret storage will
 * be different on each platform and the secrets will not be synced across
 * machines.
 */
export interface SecretStorage {
    /**
     * Retrieve a secret that was stored with key. Returns undefined if there
     * is no password matching that key.
     * @param key The key the secret was stored under.
     * @returns The stored value or `undefined`.
     */
    get(key: string): Thenable<string | undefined>;

    /**
     * Store a secret under a given key.
     * @param key The key to store the secret under.
     * @param value The secret.
     */
    store(key: string, value: string): Thenable<void>;

    /**
     * Remove a secret from storage.
     * @param key The key the secret was stored under.
     */
    delete(key: string): Thenable<void>;
}

/**
 * Denotes a location of an editor in the window. Editors can be arranged in a grid
 * and each column represents one editor location in that grid by counting the editors
 * in order of their appearance.
 */
export enum ViewColumn {
    /**
     * A *symbolic* editor column representing the currently active column. This value
     * can be used when opening editors, but the *resolved* {@link TextEditor.viewColumn viewColumn}-value
     * of editors will always be `One`, `Two`, `Three`,... or `undefined` but never `Active`.
     */
    Active = -1,
    /**
     * A *symbolic* editor column representing the column to the side of the active one. This value
     * can be used when opening editors, but the *resolved* {@link TextEditor.viewColumn viewColumn}-value
     * of editors will always be `One`, `Two`, `Three`,... or `undefined` but never `Beside`.
     */
    Beside = -2,
    /**
     * The first editor column.
     */
    One = 1,
    /**
     * The second editor column.
     */
    Two = 2,
    /**
     * The third editor column.
     */
    Three = 3,
    /**
     * The fourth editor column.
     */
    Four = 4,
    /**
     * The fifth editor column.
     */
    Five = 5,
    /**
     * The sixth editor column.
     */
    Six = 6,
    /**
     * The seventh editor column.
     */
    Seven = 7,
    /**
     * The eighth editor column.
     */
    Eight = 8,
    /**
     * The ninth editor column.
     */
    Nine = 9
}

/**
 * An output channel is a container for readonly textual information.
 *
 * To get an instance of an `OutputChannel` use
 * {@link window.createOutputChannel createOutputChannel}.
 */
export interface OutputChannel {
    /**
     * Append the given value and a line feed character
     * to the channel.
     *
     * @param value A string, falsy values will be printed.
     */
    appendLine(value: string): void;

    /**
     * Dispose and free associated resources.
     */
    dispose(): void;
}

/**
 * Content settings for a webview.
 */
export interface WebviewOptions {
    /**
     * Controls whether scripts are enabled in the webview content or not.
     *
     * Defaults to false (scripts-disabled).
     */
    readonly enableScripts?: boolean;

    /**
     * Root paths from which the webview can load local (filesystem) resources using uris from `asWebviewUri`
     *
     * Default to the root folders of the current workspace plus the extension's install directory.
     *
     * Pass in an empty array to disallow access to any local resources.
     */
    readonly localResourceRoots?: readonly Uri[];
}

/**
 * Displays html content, similarly to an iframe.
 */
export interface Webview {
    /**
     * Content settings for the webview.
     */
    options: WebviewOptions;

    /**
     * HTML contents of the webview.
     *
     * This should be a complete, valid html document. Changing this property causes the webview to be reloaded.
     *
     * Webviews are sandboxed from normal extension process, so all communication with the webview must use
     * message passing. To send a message from the extension to the webview, use {@linkcode Webview.postMessage postMessage}.
     * To send message from the webview back to an extension, use the `acquireVsCodeApi` function inside the webview
     * to get a handle to the editor's api and then call `.postMessage()`:
     *
     * ```html
     * <script>
     *     const vscode = acquireVsCodeApi(); // acquireVsCodeApi can only be invoked once
     *     vscode.postMessage({ message: 'hello!' });
     * </script>
     * ```
     *
     * To load a resources from the workspace inside a webview, use the {@linkcode Webview.asWebviewUri asWebviewUri} method
     * and ensure the resource's directory is listed in {@linkcode WebviewOptions.localResourceRoots}.
     *
     * Keep in mind that even though webviews are sandboxed, they still allow running scripts and loading arbitrary content,
     * so extensions must follow all standard web security best practices when working with webviews. This includes
     * properly sanitizing all untrusted input (including content from the workspace) and
     * setting a [content security policy](https://aka.ms/vscode-api-webview-csp).
     */
    html: string;

    /**
     * Fired when the webview content posts a message.
     *
     * Webview content can post strings or json serializable objects back to an extension. They cannot
     * post `Blob`, `File`, `ImageData` and other DOM specific objects since the extension that receives the
     * message does not run in a browser environment.
     */
    readonly onDidReceiveMessage: Event<any>;

    /**
     * Post a message to the webview content.
     *
     * Messages are only delivered if the webview is live (either visible or in the
     * background with `retainContextWhenHidden`).
     *
     * @param message Body of the message. This must be a string or other json serializable object.
     *
     *   For older versions of vscode, if an `ArrayBuffer` is included in `message`,
     *   it will not be serialized properly and will not be received by the webview.
     *   Similarly any TypedArrays, such as a `Uint8Array`, will be very inefficiently
     *   serialized and will also not be recreated as a typed array inside the webview.
     *
     *   However if your extension targets vscode 1.57+ in the `engines` field of its
     *   `package.json`, any `ArrayBuffer` values that appear in `message` will be more
     *   efficiently transferred to the webview and will also be correctly recreated inside
     *   of the webview.
     *
     * @returns A promise that resolves when the message is posted to a webview or when it is
     * dropped because the message was not deliverable.
     *
     *   Returns `true` if the message was posted to the webview. Messages can only be posted to
     * live webviews (i.e. either visible webviews or hidden webviews that set `retainContextWhenHidden`).
     *
     *   A response of `true` does not mean that the message was actually received by the webview.
     *   For example, no message listeners may be have been hooked up inside the webview or the webview may
     *   have been destroyed after the message was posted but before it was received.
     *
     *   If you want confirm that a message as actually received, you can try having your webview posting a
     *   confirmation message back to your extension.
     */
    postMessage(message: any): Thenable<boolean>;

    /**
     * Convert a uri for the local file system to one that can be used inside webviews.
     *
     * Webviews cannot directly load resources from the workspace or local file system using `file:` uris. The
     * `asWebviewUri` function takes a local `file:` uri and converts it into a uri that can be used inside of
     * a webview to load the same resource:
     *
     * ```ts
     * webview.html = `<img src="${webview.asWebviewUri(vscode.Uri.file('/Users/codey/workspace/cat.gif'))}">`
     * ```
     */
    asWebviewUri(localResource: Uri): Uri;

    /**
     * Content security policy source for webview resources.
     *
     * This is the origin that should be used in a content security policy rule:
     *
     * ```ts
     * `img-src https: ${webview.cspSource} ...;`
     * ```
     */
    readonly cspSource: string;
}

/**
 * Content settings for a webview panel.
 */
export interface WebviewPanelOptions {
    /**
     * Controls if the webview panel's content (iframe) is kept around even when the panel
     * is no longer visible.
     *
     * Normally the webview panel's html context is created when the panel becomes visible
     * and destroyed when it is hidden. Extensions that have complex state
     * or UI can set the `retainContextWhenHidden` to make the editor keep the webview
     * context around, even when the webview moves to a background tab. When a webview using
     * `retainContextWhenHidden` becomes hidden, its scripts and other dynamic content are suspended.
     * When the panel becomes visible again, the context is automatically restored
     * in the exact same state it was in originally. You cannot send messages to a
     * hidden webview, even with `retainContextWhenHidden` enabled.
     *
     * `retainContextWhenHidden` has a high memory overhead and should only be used if
     * your panel's context cannot be quickly saved and restored.
     */
    readonly retainContextWhenHidden?: boolean;
}

/**
 * A panel that contains a webview.
 */
export interface WebviewPanel {
    /**
     * Icon for the panel shown in UI.
     */
    iconPath?: Uri | {
        /**
         * The icon path for the light theme.
         */
        readonly light: Uri;
        /**
         * The icon path for the dark theme.
         */
        readonly dark: Uri;
    };

    /**
     * {@linkcode Webview} belonging to the panel.
     */
    readonly webview: Webview;

    /**
     * Content settings for the webview panel.
     */
    readonly options: WebviewPanelOptions;

    /**
     * Whether the panel is visible.
     */
    readonly visible: boolean;

    /**
     * Fired when the panel's view state changes.
     */
    readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;

    /**
     * Fired when the panel is disposed.
     *
     * This may be because the user closed the panel or because `.dispose()` was
     * called on it.
     *
     * Trying to use the panel after it has been disposed throws an exception.
     */
    readonly onDidDispose: Event<void>;

    /**
     * Dispose of the webview panel.
     *
     * This closes the panel if it showing and disposes of the resources owned by the webview.
     * Webview panels are also disposed when the user closes the webview panel. Both cases
     * fire the `onDispose` event.
     */
    dispose(): any;
}

/**
 * Event fired when a webview panel's view state changes.
 */
export interface WebviewPanelOnDidChangeViewStateEvent {
}

/**
 * Provider for creating `WebviewView` elements.
 */
export interface WebviewViewProvider {
    /**
     * Resolves a webview view.
     *
     * `resolveWebviewView` is called when a view first becomes visible. This may happen when the view is
     * first loaded or when the user hides and then shows a view again.
     *
     * @param webviewView Webview view to restore. The provider should take ownership of this view. The
     *    provider must set the webview's `.html` and hook up all webview events it is interested in.
     * @param context Additional metadata about the view being resolved.
     * @param token Cancellation token indicating that the view being provided is no longer needed.
     *
     * @returns Optional thenable indicating that the view has been fully resolved.
     */
    resolveWebviewView(webviewView: WebviewView): Thenable<void>;
}

/**
 * A webview based view.
 */
export interface WebviewView {
    /**
     * The underlying webview for the view.
     */
    readonly webview: Webview;

    /**
     * Event fired when the view is disposed.
     *
     * Views are disposed when they are explicitly hidden by a user (this happens when a user
     * right clicks in a view and unchecks the webview view).
     *
     * Trying to use the view after it has been disposed throws an exception.
     */
    readonly onDidDispose: Event<void>;

    /**
     * Tracks if the webview is currently visible.
     *
     * Views are visible when they are on the screen and expanded.
     */
    readonly visible: boolean;

    /**
     * Event fired when the visibility of the view changes.
     *
     * Actions that trigger a visibility change:
     *
     * - The view is collapsed or expanded.
     * - The user switches to a different view group in the sidebar or panel.
     *
     * Note that hiding a view using the context menu instead disposes of the view and fires `onDidDispose`.
     */
    readonly onDidChangeVisibility: Event<void>;
}

/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 */
export enum FileType {
    /**
     * The file type is unknown.
     */
    Unknown = 0,
    /**
     * A regular file.
     */
    File = 1,
    /**
     * A directory.
     */
    Directory = 2,
    /**
     * A symbolic link to a file.
     */
    SymbolicLink = 64
}

/**
 * Permissions of a file.
 */
export enum FilePermission {
    /**
     * The file is readonly.
     *
     * *Note:* All `FileStat` from a `FileSystemProvider` that is registered with
     * the option `isReadonly: true` will be implicitly handled as if `FilePermission.Readonly`
     * is set. As a consequence, it is not possible to have a readonly file system provider
     * registered where some `FileStat` are not readonly.
     */
    Readonly = 1
}

/**
 * The `FileStat`-type represents metadata about a file
 */
export interface FileStat {
    /**
     * The type of the file, e.g. is a regular file, a directory, or symbolic link
     * to a file.
     *
     * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
     */
    type: FileType;
}

/**
 * Enumeration of file change types.
 */
export enum FileChangeType {

    /**
     * The contents or metadata of a file have changed.
     */
    Changed = 1,

    /**
     * A file has been created.
     */
    Created = 2,

    /**
     * A file has been deleted.
     */
    Deleted = 3,
}

/**
 * The file system interface exposes the editor's built-in and contributed
 * {@link FileSystemProvider file system providers}. It allows extensions to work
 * with files from the local disk as well as files from remote places, like the
 * remote extension host or ftp-servers.
 *
 * *Note* that an instance of this interface is available as {@linkcode workspace.fs}.
 */
export interface FileSystem {

    /**
     * Retrieve metadata about a file.
     *
     * @param uri The uri of the file to retrieve metadata about.
     * @returns The file metadata about the file.
     */
    stat(uri: Uri): Thenable<FileStat>;

    /**
     * Write data to a file, replacing its entire contents.
     *
     * @param uri The uri of the file.
     * @param content The new content of the file.
     */
    writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
}

/**
 * An event that is fired after files are created.
 */
export interface FileCreateEvent {

    /**
     * The files that got created.
     */
    readonly files: readonly Uri[];
}


/**
 * An event that is fired after files are renamed.
 */
export interface FileRenameEvent {

    /**
     * The files that got renamed.
     */
    readonly files: ReadonlyArray<{
        /**
         * The old uri of a file.
         */
        readonly oldUri: Uri;
        /**
         * The new uri of a file.
         */
        readonly newUri: Uri;
    }>;
}

/**
 * An event that is fired after files are deleted.
 */
export interface FileDeleteEvent {

    /**
     * The files that got deleted.
     */
    readonly files: readonly Uri[];
}

/**
 * An event describing the change in Configuration
 */
export interface ConfigurationChangeEvent {

    /**
     * Checks if the given section has changed.
     * If scope is provided, checks if the section has changed for resources under the given scope.
     *
     * @param section Configuration name, supports _dotted_ names.
     * @returns `true` if the given section has changed.
     */
    affectsConfiguration(section: string): boolean;
}

/**
 * A workspace folder is one of potentially many roots opened by the editor. All workspace folders
 * are equal which means there is no notion of an active or primary workspace folder.
 */
export interface WorkspaceFolder {

    /**
     * The associated uri for this workspace folder.
     *
     * *Note:* The {@link Uri}-type was intentionally chosen such that future releases of the editor can support
     * workspace folders that are not stored on the local disk, e.g. `ftp://server/workspaces/foo`.
     */
    readonly uri: Uri;
}

/**
 * Represents a tab within a {@link TabGroup group of tabs}.
 * Tabs are merely the graphical representation within the editor area.
 * A backing editor is not a guarantee.
 */
export interface Tab {
    /**
     * Defines the structure of the tab i.e. text, notebook, custom, etc.
     * Resource and other useful properties are defined on the tab kind.
     */
    readonly input: TabInputText | TabInputTextDiff | unknown;

    /**
     * Whether or not the dirty indicator is present on the tab.
     */
    readonly isDirty: boolean;
}

/**
 * Represents a group of tabs. A tab group itself consists of multiple tabs.
 */
export interface TabGroup {

    /**
     * The view column of the group.
     */
    readonly viewColumn: ViewColumn;

    /**
     * The list of tabs contained within the group.
     * This can be empty if the group has no tabs open.
     */
    readonly tabs: readonly Tab[];
}

/**
 * Represents the main editor area which consists of multiple groups which contain tabs.
 */
export interface TabGroups {
    /**
     * All the groups within the group container.
     */
    readonly all: readonly TabGroup[];

    /**
     * Closes the tab. This makes the tab object invalid and the tab
     * should no longer be used for further actions.
     * Note: In the case of a dirty tab, a confirmation dialog will be shown which may be cancelled. If cancelled the tab is still valid
     *
     * @param tab The tab to close.
     * @returns A promise that resolves to `true` when all tabs have been closed.
     */
    close(tab: Tab): Thenable<boolean>;
}

/**
 * Represents theme specific rendering styles for a {@link TextEditorDecorationType text editor decoration}.
 */
export interface ThemableDecorationRenderOptions {
    /**
     * Background color of the decoration. Use rgba() and define transparent background colors to play well with other decorations.
     * Alternatively a color from the color registry can be {@link ThemeColor referenced}.
     */
    backgroundColor?: string

    /**
     * CSS styling property that will be applied to text enclosed by a decoration.
     */
    border?: string;

    /**
     * CSS styling property that will be applied to text enclosed by a decoration.
     */
    opacity?: string;
}


/**
 * Represents rendering styles for a {@link TextEditorDecorationType text editor decoration}.
 */
export interface DecorationRenderOptions extends ThemableDecorationRenderOptions {
    /**
     * Should the decoration be rendered also on the whitespace after the line text.
     * Defaults to `false`.
     */
    isWholeLine?: boolean;
}

/**
 * Represents options to configure the behavior of showing a {@link TextDocument document} in an {@link TextEditor editor}.
 */
export interface TextDocumentShowOptions {
    /**
     * An optional flag that controls if an {@link TextEditor editor}-tab shows as preview. Preview tabs will
     * be replaced and reused until set to stay - either explicitly or through editing.
     *
     * *Note* that the flag is ignored if a user has disabled preview editors in settings.
     */
    preview?: boolean;
}


/**
 * Options to configure the behaviour of a file open dialog.
 *
 * * Note 1: On Windows and Linux, a file dialog cannot be both a file selector and a folder selector, so if you
 * set both `canSelectFiles` and `canSelectFolders` to `true` on these platforms, a folder selector will be shown.
 * * Note 2: Explicitly setting `canSelectFiles` and `canSelectFolders` to `false` is futile
 * and the editor then silently adjusts the options to select files.
 */
export interface OpenDialogOptions {
    /**
     * A human-readable string for the open button.
     */
    openLabel?: string;

    /**
     * Allow to select many files or folders.
     */
    canSelectMany?: boolean;

    /**
     * A set of file filters that are used by the dialog. Each entry is a human-readable label,
     * like "TypeScript", and an array of extensions, for example:
     * ```ts
     * {
     * 	'Images': ['png', 'jpg'],
     * 	'TypeScript': ['ts', 'tsx']
     * }
     * ```
     */
    filters?: { [name: string]: string[] };
}

/**
 * Options to configure the behaviour of a file save dialog.
 */
export interface SaveDialogOptions {
    /**
     * The resource the dialog shows when opened.
     */
    defaultUri?: Uri;

    /**
     * A set of file filters that are used by the dialog. Each entry is a human-readable label,
     * like "TypeScript", and an array of extensions, for example:
     * ```ts
     * {
     * 	'Images': ['png', 'jpg'],
     * 	'TypeScript': ['ts', 'tsx']
     * }
     * ```
     */
    filters?: { [name: string]: string[] };
}


/**
 * Describes how to select language models for chat requests.
 *
 * @see {@link lm.selectChatModels}
 */
export interface LanguageModelChatSelector {
    /**
     * A vendor of language models.
     * @see {@link LanguageModelChat.vendor}
     */
    vendor?: string;

    /**
     * A family of language models.
     * @see {@link LanguageModelChat.family}
     */
    family?: string;

    /**
     * The version of a language model.
     * @see {@link LanguageModelChat.version}
     */
    version?: string;

    /**
     * The identifier of a language model.
     * @see {@link LanguageModelChat.id}
     */
    id?: string;
}

/**
 * A location in the editor at which progress information can be shown. It depends on the
 * location how progress is visually represented.
 */
export enum ProgressLocation {

    /**
     * Show progress for the source control viewlet, as overlay for the icon and as progress bar
     * inside the viewlet (when visible). Neither supports cancellation nor discrete progress nor
     * a label to describe the operation.
     */
    SourceControl = 1,

    /**
     * Show progress in the status bar of the editor. Neither supports cancellation nor discrete progress.
     * Supports rendering of {@link ThemeIcon theme icons} via the `$(<name>)`-syntax in the progress label.
     */
    Window = 10,

    /**
     * Show progress as notification with an optional cancel button. Supports to show infinite and discrete
     * progress but does not support rendering of icons.
     */
    Notification = 15
}

/**
 * Value-object describing where and how progress should show.
 */
export interface ProgressOptions {

    /**
     * The location at which progress should show.
     */
    location: ProgressLocation | {
        /**
         * The identifier of a view for which progress should be shown.
         */
        viewId: string;
    };

    /**
     * A human-readable string which will be used to describe the
     * operation.
     */
    title?: string;

    /**
     * Controls if a cancel button should show to allow the user to
     * cancel the long running operation.  Note that currently only
     * `ProgressLocation.Notification` is supporting to show a cancel
     * button.
     */
    cancellable?: boolean;
}

/**
 * Options to configure the behavior of the message.
 *
 * @see {@link window.showInformationMessage showInformationMessage}
 * @see {@link window.showWarningMessage showWarningMessage}
 * @see {@link window.showErrorMessage showErrorMessage}
 */
export interface MessageOptions {

    /**
     * Indicates that this message should be modal.
     */
    modal?: boolean;
}

/**
 * A language selector is the combination of one or many language identifiers
 * and {@link DocumentFilter language filters}.
 *
 * *Note* that a document selector that is just a language identifier selects *all*
 * documents, even those that are not saved on disk. Only use such selectors when
 * a feature works without further context, e.g. without the need to resolve related
 * 'files'.
 *
 * @example
 * let sel:DocumentSelector = { scheme: 'file', language: 'typescript' };
 */
export type DocumentSelector = string | ReadonlyArray<string>;

/**
 * A provider result represents the values a provider, like the {@linkcode HoverProvider},
 * may return. For once this is the actual result type `T`, like `Hover`, or a thenable that resolves
 * to that type `T`. In addition, `null` and `undefined` can be returned - either directly or from a
 * thenable.
 *
 * The snippets below are all valid implementations of the {@linkcode HoverProvider}:
 *
 * ```ts
 * let a: HoverProvider = {
 * 	provideHover(doc, pos, token): ProviderResult<Hover> {
 * 		return new Hover('Hello World');
 * 	}
 * }
 *
 * let b: HoverProvider = {
 * 	provideHover(doc, pos, token): ProviderResult<Hover> {
 * 		return new Promise(resolve => {
 * 			resolve(new Hover('Hello World'));
 * 	 	});
 * 	}
 * }
 *
 * let c: HoverProvider = {
 * 	provideHover(doc, pos, token): ProviderResult<Hover> {
 * 		return; // undefined
 * 	}
 * }
 * ```
 */
export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

/**
 * Contains additional diagnostic information about the context in which
 * a {@link CodeActionProvider.provideCodeActions code action} is run.
 */
export interface CodeActionContext {
    /**
     * An array of diagnostics.
     */
    readonly diagnostics: readonly Diagnostic[];
}


/**
 * Provides contextual actions for code. Code actions typically either fix problems or beautify/refactor code.
 *
 * Code actions are surfaced to users in a few different ways:
 *
 * - The [lightbulb](https://code.visualstudio.com/docs/editor/editingevolved#_code-action) feature, which shows
 *   a list of code actions at the current cursor position. The lightbulb's list of actions includes both quick fixes
 *   and refactorings.
 * - As commands that users can run, such as `Refactor`. Users can run these from the command palette or with keybindings.
 * - As source actions, such `Organize Imports`.
 * - {@link CodeActionKind.QuickFix Quick fixes} are shown in the problems view.
 * - Change applied on save by the `editor.codeActionsOnSave` setting.
 */
export interface CodeActionProvider<T extends CodeAction = CodeAction> {
    /**
     * Get code actions for a given range in a document.
     *
     * Only return code actions that are relevant to user for the requested range. Also keep in mind how the
     * returned code actions will appear in the UI. The lightbulb widget and `Refactor` commands for instance show
     * returned code actions as a list, so do not return a large number of code actions that will overwhelm the user.
     *
     * @param document The document in which the command was invoked.
     * @param range The selector or range for which the command was invoked. This will always be a
     * {@link Selection selection} if the actions are being requested in the currently active editor.
     * @param context Provides additional information about what code actions are being requested. You can use this
     * to see what specific type of code actions are being requested by the editor in order to return more relevant
     * actions and avoid returning irrelevant code actions that the editor will discard.
     * @param token A cancellation token.
     *
     * @returns An array of code actions, such as quick fixes or refactorings. The lack of a result can be signaled
     * by returning `undefined`, `null`, or an empty array.
     *
     * We also support returning `Command` for legacy reasons, however all new extensions should return
     * `CodeAction` object instead.
     */
    provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<Array<Command | T>>;
}

/**
 * Metadata about the type of code actions that a {@link CodeActionProvider} provides.
 */
export interface CodeActionProviderMetadata {
    /**
     * List of {@link CodeActionKind CodeActionKinds} that a {@link CodeActionProvider} may return.
     *
     * This list is used to determine if a given `CodeActionProvider` should be invoked or not.
     * To avoid unnecessary computation, every `CodeActionProvider` should list use `providedCodeActionKinds`. The
     * list of kinds may either be generic, such as `[CodeActionKind.Refactor]`, or list out every kind provided,
     * such as `[CodeActionKind.Refactor.Extract.append('function'), CodeActionKind.Refactor.Extract.append('constant'), ...]`.
     */
    readonly providedCodeActionKinds?: readonly CodeActionKind[];
}

/**
 * A debug session.
 */
export interface DebugSession {
    /**
     * The unique ID of this debug session.
     */
    readonly id: string;

    /**
     * The debug session's name is initially taken from the {@link DebugConfiguration debug configuration}.
     * Any changes will be properly reflected in the UI.
     */
    name: string;
}

/**
 * A custom Debug Adapter Protocol event received from a {@link DebugSession debug session}.
 */
export interface DebugSessionCustomEvent {
    /**
     * The {@link DebugSession debug session} for which the custom event was received.
     */
    readonly session: DebugSession;

    /**
     * Type of event.
     */
    readonly event: string;

    /**
     * Event specific information.
     */
    readonly body: any;
}

/**
 * The clipboard provides read and write access to the system's clipboard.
 */
export interface Clipboard {

    /**
     * Read the current clipboard contents as text.
     * @returns A thenable that resolves to a string.
     */
    readText(): Thenable<string>;

    /**
     * Writes text into the clipboard.
     * @returns A thenable that resolves when writing happened.
     */
    writeText(value: string): Thenable<void>;
}

/**
 * Thenable is a common denominator between ES6 promises, Q, jquery.Deferred, WinJS.Promise,
 * and others. This API makes no assumption about what promise library is being used which
 * enables reusing existing code without migrating to a specific promise implementation. Still,
 * we recommend the use of native promises which are available in this editor.
 */
export interface Thenable<T> extends PromiseLike<T> { }
