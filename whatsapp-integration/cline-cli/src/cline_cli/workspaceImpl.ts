import {
    ConfigurationChangeEvent,
    Disposable,
    EventEmitter,
    FileSystem,
    FileCreateEvent,
    FileDeleteEvent,
    FileRenameEvent,
    FileSystemWatcher,
    GlobPattern,
    TextDocument,
    TextDocumentContentProvider,
    Uri,
    WorkspaceConfiguration,
    WorkspaceEdit,
    WorkspaceFolder,
    Event,
    Workspace,
    Range,
} from "vscode-interface"
import  * as nodeFs from "fs"

export class WorkspaceImpl implements Workspace {
    readonly fs: FileSystem = null as any; // TODO: fix

    private onChangeFilesEmitter: EventEmitter<Uri> = new EventEmitter()
    readonly onChangeFiles: Event<Uri> = this.onChangeFilesEmitter.event

    applyEdit(edit: WorkspaceEdit): Thenable<boolean> {
        return this._applyEdit(edit) 
    }

    private async _applyEdit(edit: WorkspaceEdit): Promise<boolean> {
        if (edit.uri == null || edit.range == null) {
            return false
        }

        const result = this.replace(edit.uri, edit.range, edit.newText ?? "")
        if (result) {
            this.onChangeFilesEmitter.fire(edit.uri)
        }
        return result
    }

    private replace(uri: Uri, range: Range, text: string) {
        try {
            const file = nodeFs.readFileSync(uri.fsPath, 'utf-8')
            let result = ""
            const lines = file.split('\n')
            for (let line = 0; line < lines.length; line++) {
                const lineText = lines[line]
                const suffix = line + 1 == lines.length ? "" : "\n"

                if (line < range.start.line || line > range.end.line) {
                    result += lineText + suffix
                    continue
                }

                if (line === range.start.line) {
                    const needToAdd = range.start.character

                    for (let c = 0; c < needToAdd && c < lineText.length; c++) {
                        result += lineText[c]
                    }

                    result += text
                }

                if (line === range.end.line) {
                    for (let c = range.end.character; c < lineText.length; c++) {
                        result += lineText[c]
                    }

                    result += suffix
                }
            }

            nodeFs.writeFileSync(uri.fsPath, result, "utf-8")
            return true
        }
        catch {
            return false
        }
    }

    readonly textDocuments: readonly TextDocument[] = [] // TODO: fix

    openTextDocument(uri: Uri): Thenable<TextDocument> {
        throw new Error("not implemented")
    }

    getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined {
        throw new Error("not implemented")
    }

    registerTextDocumentContentProvider(scheme: string, provider: TextDocumentContentProvider): Disposable {
        throw new Error("not implemented")
    }

    readonly onDidCreateFilesEmitter: EventEmitter<FileCreateEvent> = new EventEmitter<FileCreateEvent>()

    get onDidCreateFiles(): Event<FileCreateEvent> {
        return this.onDidCreateFilesEmitter.event
    }

    readonly onDidDeleteFilesEmitter: EventEmitter<FileDeleteEvent> = new EventEmitter<FileDeleteEvent>()

    get onDidDeleteFiles(): Event<FileDeleteEvent> {
        return this.onDidDeleteFilesEmitter.event
    }

    readonly onDidRenameFilesEmitter: EventEmitter<FileRenameEvent> = new EventEmitter<FileRenameEvent>()

    get onDidRenameFiles(): Event<FileRenameEvent> { return this.onDidRenameFilesEmitter.event }

    readonly onDidSaveTextDocumentEmitter: EventEmitter<TextDocument> = new EventEmitter<TextDocument>()

    get onDidSaveTextDocument(): Event<TextDocument> { return this.onDidSaveTextDocumentEmitter.event }

    readonly onDidChangeConfigurationEmitter: EventEmitter<ConfigurationChangeEvent> = new EventEmitter<ConfigurationChangeEvent>()

    get onDidChangeConfiguration(): Event<ConfigurationChangeEvent> { return this.onDidChangeConfigurationEmitter.event }

    private _configuration: WorkspaceConfiguration = new WorkspaceConfigurationImpl()

    setRootConfiguration(configuration: Record<string, any>) {
        this._configuration = new WorkspaceConfigurationImpl(configuration)
    }

    getConfiguration(section?: string): WorkspaceConfiguration {
        if (section == null) {
            return this._configuration
        }

        const configuration = this._configuration.get(section, {})
        if (configuration != null && typeof configuration === 'object') {
            return new WorkspaceConfigurationImpl(configuration)
        }

        return new WorkspaceConfigurationImpl()
    }

    asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string {
        throw new Error('not implemented');
    }

    private _workspaceFolder?: WorkspaceFolder

    setWorkspaceFolder(workspaceFolder: WorkspaceFolder) {
        this._workspaceFolder = workspaceFolder
    }

    get workspaceFolders(): readonly WorkspaceFolder[] | undefined {
        if (this._workspaceFolder) {
            return [this._workspaceFolder]
        }

        return []
    }

    createFileSystemWatcher(globPattern: GlobPattern): FileSystemWatcher {
        // do nothing
        console.log("createFileSystemWatcher", globPattern)
        return new NullFileSystemWatcher()
    }
}

class WorkspaceConfigurationImpl implements WorkspaceConfiguration {
    private configuration: Record<string, any> = {};

    private static merge(left: any, right: any): any {
        if (typeof left !== 'object' || left == null) {
            return right
        }

        if (typeof right !== 'object' || right == null) {
            return left
        }

        for (const [key, value] of Object.entries(right)) {
            left[key] = this.merge(left[key], value)
        }
    }

    private static normalizeRecord(configuration: Record<string, any>): Record<string, any> {
        const normalized: Record<string, any> = {};
        for (const [key, value] of Object.entries(configuration)) {
            if (value == null) {
                continue
            }

            const xs = key.split('.').filter(x => x.length > 0)
            if (xs.length === 0) {
                continue
            }

            let target = normalized
            for (let i = 0; i < xs.length - 1; i++) {
                let currentKey = xs[i]
                let current = target[currentKey]
                if (current == null || typeof current !== 'object') {
                    current = {}
                    target[currentKey] = current
                }

                target = current
            }

            const targetKey = xs[xs.length - 1]

            target[targetKey] = this.merge(target[targetKey], value)
        }
        return normalized;
    }

    constructor(initialConfig: Record<string, any> = {}) {
        this.configuration = WorkspaceConfigurationImpl.normalizeRecord(initialConfig);
    }

    get<T>(section: string, defaultValue?: T): T {
        const keys = section.split('.');
        let result: any = this.configuration;

        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return defaultValue as T;
            }
        }

        return result as T;
    }
}

class NullFileSystemWatcher extends Disposable implements FileSystemWatcher {
    placeholderEmitter: EventEmitter<Uri> = new EventEmitter<Uri>()

    constructor() {
        super(() => {
            this.placeholderEmitter.dispose()
        })
    }

    get onDidChange(): Event<Uri> {
        return this.placeholderEmitter.event
    }

    get onDidCreate(): Event<Uri> {
        return this.placeholderEmitter.event
    }

    get onDidDelete(): Event<Uri> {
        return this.placeholderEmitter.event
    }
}
