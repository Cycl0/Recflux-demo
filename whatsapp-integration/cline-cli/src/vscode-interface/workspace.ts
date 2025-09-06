import {
    ConfigurationChangeEvent,
    Event,
    FileCreateEvent,
    FileDeleteEvent,
    FileRenameEvent,
    FileSystemWatcher,
    GlobPattern,
    TextDocument,
    TextDocumentContentProvider,
    Thenable,
    WorkspaceConfiguration,
    WorkspaceFolder,
    FileSystem,
} from "./types"
import { Uri } from "./uri"
import { Disposable } from "./disposable"
import { WorkspaceEdit } from "./workspaceEdit";

export interface Workspace {
    /**
     * A {@link FileSystem file system} instance that allows to interact with local and remote
     * files, e.g. `vscode.workspace.fs.readDirectory(someUri)` allows to retrieve all entries
     * of a directory or `vscode.workspace.fs.stat(anotherUri)` returns the meta data for a
     * file.
     */
    readonly fs: FileSystem

    /**
     * Make changes to one or many resources or create, delete, and rename resources as defined by the given
     * {@link WorkspaceEdit workspace edit}.
     *
     * All changes of a workspace edit are applied in the same order in which they have been added. If
     * multiple textual inserts are made at the same position, these strings appear in the resulting text
     * in the order the 'inserts' were made, unless that are interleaved with resource edits. Invalid sequences
     * like 'delete file a' -> 'insert text in file a' cause failure of the operation.
     *
     * When applying a workspace edit that consists only of text edits an 'all-or-nothing'-strategy is used.
     * A workspace edit with resource creations or deletions aborts the operation, e.g. consecutive edits will
     * not be attempted, when a single edit fails.
     *
     * @param edit A workspace edit.
     * @returns A thenable that resolves when the edit could be applied.
     */
    applyEdit(edit: WorkspaceEdit): Thenable<boolean>

    /**
     * All text documents currently known to the editor.
     */
    readonly textDocuments: readonly TextDocument[]

    /**
     * Opens a document. Will return early if this document is already open. Otherwise
     * the document is loaded and the {@link workspace.onDidOpenTextDocument didOpen}-event fires.
     *
     * The document is denoted by an {@link Uri}. Depending on the {@link Uri.scheme scheme} the
     * following rules apply:
     * * `file`-scheme: Open a file on disk (`openTextDocument(Uri.file(path))`). Will be rejected if the file
     * does not exist or cannot be loaded.
     * * `untitled`-scheme: Open a blank untitled file with associated path (`openTextDocument(Uri.file(path).with({ scheme: 'untitled' }))`).
     * The language will be derived from the file name.
     * * For all other schemes contributed {@link TextDocumentContentProvider text document content providers} and
     * {@link FileSystemProvider file system providers} are consulted.
     *
     * *Note* that the lifecycle of the returned document is owned by the editor and not by the extension. That means an
     * {@linkcode workspace.onDidCloseTextDocument onDidClose}-event can occur at any time after opening it.
     *
     * @param uri Identifies the resource to open.
     * @returns A promise that resolves to a {@link TextDocument document}.
     */
    openTextDocument(uri: Uri): Thenable<TextDocument>

    /**
     * Returns the {@link WorkspaceFolder workspace folder} that contains a given uri.
     * * returns `undefined` when the given uri doesn't match any workspace folder
     * * returns the *input* when the given uri is a workspace folder itself
     *
     * @param uri An uri.
     * @returns A workspace folder or `undefined`
     */
    getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined

    /**
     * Register a text document content provider.
     *
     * Only one provider can be registered per scheme.
     *
     * @param scheme The uri-scheme to register for.
     * @param provider A content provider.
     * @returns A {@link Disposable} that unregisters this provider when being disposed.
     */
    registerTextDocumentContentProvider(scheme: string, provider: TextDocumentContentProvider): Disposable

    /**
     * An event that is emitted when files have been created.
     *
     * *Note:* This event is triggered by user gestures, like creating a file from the
     * explorer, or from the {@linkcode workspace.applyEdit}-api, but this event is *not* fired when
     * files change on disk, e.g triggered by another application, or when using the
     * {@linkcode FileSystem workspace.fs}-api.
     */
    readonly onDidCreateFiles: Event<FileCreateEvent>

    /**
     * An event that is emitted when files have been deleted.
     *
     * *Note 1:* This event is triggered by user gestures, like deleting a file from the
     * explorer, or from the {@linkcode workspace.applyEdit}-api, but this event is *not* fired when
     * files change on disk, e.g triggered by another application, or when using the
     * {@linkcode FileSystem workspace.fs}-api.
     *
     * *Note 2:* When deleting a folder with children only one event is fired.
     */
    readonly onDidDeleteFiles: Event<FileDeleteEvent>


    /**
     * An event that is emitted when files have been renamed.
     *
     * *Note 1:* This event is triggered by user gestures, like renaming a file from the
     * explorer, and from the {@linkcode workspace.applyEdit}-api, but this event is *not* fired when
     * files change on disk, e.g triggered by another application, or when using the
     * {@linkcode FileSystem workspace.fs}-api.
     *
     * *Note 2:* When renaming a folder with children only one event is fired.
     */
    readonly onDidRenameFiles: Event<FileRenameEvent>

    /**
     * An event that is emitted when a {@link TextDocument text document} is saved to disk.
     */
    readonly onDidSaveTextDocument: Event<TextDocument>

    /**
     * An event that is emitted when the {@link WorkspaceConfiguration configuration} changed.
     */
    readonly onDidChangeConfiguration: Event<ConfigurationChangeEvent>

    /**
     * Get a workspace configuration object.
     *
     * When a section-identifier is provided only that part of the configuration
     * is returned. Dots in the section-identifier are interpreted as child-access,
     * like `{ myExt: { setting: { doIt: true }}}` and `getConfiguration('myExt.setting').get('doIt') === true`.
     *
     * When a scope is provided configuration confined to that scope is returned. Scope can be a resource or a language identifier or both.
     *
     * @param section A dot-separated identifier.
     * @returns The full configuration or a subset.
     */
    getConfiguration(section?: string): WorkspaceConfiguration

    /**
     * Returns a path that is relative to the workspace folder or folders.
     *
     * When there are no {@link workspace.workspaceFolders workspace folders} or when the path
     * is not contained in them, the input is returned.
     *
     * @param pathOrUri A path or uri. When a uri is given its {@link Uri.fsPath fsPath} is used.
     * @param includeWorkspaceFolder When `true` and when the given path is contained inside a
     * workspace folder the name of the workspace is prepended. Defaults to `true` when there are
     * multiple workspace folders and `false` otherwise.
     * @returns A path relative to the root or the input.
     */
    asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string

    /**
     * List of workspace folders (0-N) that are open in the editor. `undefined` when no workspace
     * has been opened.
     *
     * Refer to https://code.visualstudio.com/docs/editor/workspaces for more information
     * on workspaces.
     */
    readonly workspaceFolders: readonly WorkspaceFolder[] | undefined

    /**
     * Creates a file system watcher that is notified on file events (create, change, delete)
     * depending on the parameters provided.
     *
     * By default, all opened {@link workspace.workspaceFolders workspace folders} will be watched
     * for file changes recursively.
     *
     * Additional paths can be added for file watching by providing a {@link RelativePattern} with
     * a `base` path to watch. If the path is a folder and the `pattern` is complex (e.g. contains
     * `**` or path segments), it will be watched recursively and otherwise will be watched
     * non-recursively (i.e. only changes to the first level of the path will be reported).
     *
     * *Note* that paths that do not exist in the file system will be monitored with a delay until
     * created and then watched depending on the parameters provided. If a watched path is deleted,
     * the watcher will suspend and not report any events until the path is created again.
     *
     * If possible, keep the use of recursive watchers to a minimum because recursive file watching
     * is quite resource intense.
     *
     * Providing a `string` as `globPattern` acts as convenience method for watching file events in
     * all opened workspace folders. It cannot be used to add more folders for file watching, nor will
     * it report any file events from folders that are not part of the opened workspace folders.
     *
     * Optionally, flags to ignore certain kinds of events can be provided.
     *
     * To stop listening to events the watcher must be disposed.
     *
     * *Note* that file events from recursive file watchers may be excluded based on user configuration.
     * The setting `files.watcherExclude` helps to reduce the overhead of file events from folders
     * that are known to produce many file changes at once (such as `.git` folders). As such,
     * it is highly recommended to watch with simple patterns that do not require recursive watchers
     * where the exclude settings are ignored and you have full control over the events.
     *
     * *Note* that symbolic links are not automatically followed for file watching unless the path to
     * watch itself is a symbolic link.
     *
     * *Note* that the file paths that are reported for having changed may have a different path casing
     * compared to the actual casing on disk on case-insensitive platforms (typically macOS and Windows
     * but not Linux). We allow a user to open a workspace folder with any desired path casing and try
     * to preserve that. This means:
     * * if the path is within any of the workspace folders, the path will match the casing of the
     *   workspace folder up to that portion of the path and match the casing on disk for children
     * * if the path is outside of any of the workspace folders, the casing will match the case of the
     *   path that was provided for watching
     * In the same way, symbolic links are preserved, i.e. the file event will report the path of the
     * symbolic link as it was provided for watching and not the target.
     *
     * ### Examples
     *
     * The basic anatomy of a file watcher is as follows:
     *
     * ```ts
     * const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(<folder>, <pattern>));
     *
     * watcher.onDidChange(uri => { ... }); // listen to files being changed
     * watcher.onDidCreate(uri => { ... }); // listen to files/folders being created
     * watcher.onDidDelete(uri => { ... }); // listen to files/folders getting deleted
     *
     * watcher.dispose(); // dispose after usage
     * ```
     *
     * #### Workspace file watching
     *
     * If you only care about file events in a specific workspace folder:
     *
     * ```ts
     * vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], '**​/*.js'));
     * ```
     *
     * If you want to monitor file events across all opened workspace folders:
     *
     * ```ts
     * vscode.workspace.createFileSystemWatcher('**​/*.js');
     * ```
     *
     * *Note:* the array of workspace folders can be empty if no workspace is opened (empty window).
     *
     * #### Out of workspace file watching
     *
     * To watch a folder for changes to *.js files outside the workspace (non recursively), pass in a `Uri` to such
     * a folder:
     *
     * ```ts
     * vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(<path to folder outside workspace>), '*.js'));
     * ```
     *
     * And use a complex glob pattern to watch recursively:
     *
     * ```ts
     * vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(<path to folder outside workspace>), '**​/*.js'));
     * ```
     *
     * Here is an example for watching the active editor for file changes:
     *
     * ```ts
     * vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.window.activeTextEditor.document.uri, '*'));
     * ```
     *
     * @param globPattern A {@link GlobPattern glob pattern} that controls which file events the watcher should report.
     * @returns A new file system watcher instance. Must be disposed when no longer needed.
     */
    createFileSystemWatcher(globPattern: GlobPattern): FileSystemWatcher
}

class WorkspaceProxy implements Workspace {
    private _workspace?: Workspace
    setWorkspace(workspace: Workspace) {
        this._workspace = workspace
    }

    get fs(): FileSystem { return this._workspace!.fs }
    applyEdit(edit: WorkspaceEdit): Thenable<boolean> { return this._workspace!.applyEdit(edit) }
    get textDocuments(): readonly TextDocument[] { return this._workspace!.textDocuments }
    openTextDocument(uri: Uri): Thenable<TextDocument> { return this._workspace!.openTextDocument(uri) }
    getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined { return this._workspace!.getWorkspaceFolder(uri) }
    registerTextDocumentContentProvider(scheme: string, provider: TextDocumentContentProvider): Disposable { return this._workspace!.registerTextDocumentContentProvider(scheme, provider) } 
    get onDidCreateFiles(): Event<FileCreateEvent> { return this._workspace!.onDidCreateFiles }
    get onDidDeleteFiles(): Event<FileDeleteEvent> { return this._workspace!.onDidDeleteFiles }
    get onDidRenameFiles(): Event<FileRenameEvent> { return this._workspace!.onDidRenameFiles }
    get onDidSaveTextDocument(): Event<TextDocument> { return this._workspace!.onDidSaveTextDocument }
    get onDidChangeConfiguration(): Event<ConfigurationChangeEvent> { return this._workspace!.onDidChangeConfiguration }
    getConfiguration(section?: string): WorkspaceConfiguration { return this._workspace!.getConfiguration(section) }
    asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string { return this._workspace!.asRelativePath(pathOrUri, includeWorkspaceFolder) }
    get workspaceFolders(): readonly WorkspaceFolder[] | undefined { return this._workspace!.workspaceFolders }
    createFileSystemWatcher(globPattern: GlobPattern): FileSystemWatcher { return this._workspace!.createFileSystemWatcher(globPattern) }
}

export const workspace = new WorkspaceProxy()
