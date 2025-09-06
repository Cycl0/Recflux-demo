import {
    Event,
    CancellationToken,
    DecorationRenderOptions,
    EventEmitter,
    InputBoxOptions,
    MessageOptions,
    OpenDialogOptions,
    Progress,
    ProgressOptions,
    SaveDialogOptions,
    Tab,
    TabGroup,
    TabGroups,
    Terminal,
    TerminalOptions,
    TextDocument,
    TextDocumentShowOptions,
    TextEditor,
    TextEditorDecorationType,
    Uri,
    ViewColumn,
    WebviewOptions,
    WebviewPanel,
    WebviewPanelOptions,
    Window,
    Range,
    Selection,
    TextEditorRevealType,
    Position,
    TextLine,
    Thenable,
    Commands,
    TabInputText,
    TabInputTextDiff,
} from "vscode-interface";
import { expandPath } from "./pathUtil"
import * as fs from "fs"
import { WorkspaceImpl } from "./workspaceImpl";

class TextDocumentImpl implements TextDocument {
    uri: Uri
    languageId: string = ""
    isDirty: boolean = false
    lineCount: number = 0

    private _file: string
    private _fileLines: string[]

    constructor(uri: Uri) {
        this.uri = uri
        this._file = fs.readFileSync(this.uri.fsPath, "utf-8")
        this._fileLines = this._file.split("\n")
    }

    refresh() {
        this._file = fs.readFileSync(this.uri.fsPath, "utf-8")
        this._fileLines = this._file.split("\n")
    }

    save(): Thenable<boolean> {
        return Promise.resolve(true)
    }

    lineAt(line: number): TextLine {
        if (line < 0 || line > this._fileLines.length) {
            return {
                text: "",
            }
        }

        return {
            text: this._fileLines[line]
        }
    }

    positionAt(offset: number): Position {
        if (this._fileLines.length === 0) {
            return new Position(0, 0)
        }

        let lineOffset = 0
        for (let line = 0; line < this._fileLines.length; line++) {
            const nextLineOffset = lineOffset + this._fileLines[line].length + 1
            if (offset < nextLineOffset) {
                return new Position(line, offset - lineOffset)
            }

            lineOffset = nextLineOffset
        }

        return new Position(this._fileLines.length - 1, this._fileLines[this._fileLines.length - 1].length)
    }

    getText(range?: Range): string {
        if (!range) {
            return this._file
        }

        let result = ""
        for (let line = 0; line < this._fileLines.length; line ++) {
            if (line > range.end.line) {
                return result
            }

            if (line < range.start.line) {
                continue
            }

            const lineText = this._fileLines[line]

            let maxCharCount = line === range.end.line ? range.end.character : lineText.length
            maxCharCount = maxCharCount > lineText.length ? lineText.length : maxCharCount

            let startChar = line === range.start.line ? range.start.character : 0

            for (let c = startChar; c < maxCharCount; c++) {
                result += c
            }

            if (line !== range.end.line) {
                result += "\n"
            }
        }

        return result
    }
}

class TextEditorImpl implements TextEditor {
    document: TextDocument;
    selection: Selection = new Selection(new Position(0, 0), new Position(0, 0))
    viewColumn: ViewColumn | undefined;

    constructor(document: TextDocument) {
        this.document = document
    }

    setDecorations(decorationType: TextEditorDecorationType, rangesOrOptions: readonly Range[]): void {
        // do nothing
    }

    revealRange(range: Range, revealType?: TextEditorRevealType): void {
        // do nothing
    }
}

class WindowTab implements Tab {
    textDocument?: TextDocumentImpl
    input: TabInputText | TabInputTextDiff | unknown;
    isDirty: boolean = false
}

export class WindowImpl implements Window {
    private _tabs: WindowTab[] = []

    constructor(workspace: WorkspaceImpl, opts: {
        visibleFiles?: string[],
    }) {
        const tabGroup: TabGroup = {
            viewColumn: ViewColumn.Active,
            tabs: this._tabs,
        }

        this.tabGroups = {
            all: [tabGroup],
            close: (tab: Tab): Thenable<boolean> => {
                this._tabs = this._tabs.filter(x => x != tab)
                return Promise.resolve(true)
            }
        }

        workspace.onChangeFiles(uri => {
            for (const tab of this._tabs) {
                if (tab.textDocument?.uri?.fsPath == uri.fsPath) {
                    tab.textDocument.refresh()
                }
            }
        })

        const visibleTextEditors: TextEditor[] = []
        this.visibleTextEditors = visibleTextEditors

        if (opts.visibleFiles) {
            for (const file of opts.visibleFiles) {
                const uri = Uri.file(expandPath(file))
                const tab = new WindowTab()
                tab.textDocument = new TextDocumentImpl(uri)
                tab.input =  { uri },

                visibleTextEditors.push(new TextEditorImpl(tab.textDocument))
                this._tabs.push(tab)
            }
        }
    }

    readonly tabGroups: TabGroups
    activeTextEditor: TextEditor | undefined;

    visibleTextEditors: readonly TextEditor[]

    activeTerminal: Terminal | undefined

    readonly onDidChangeActiveTextEditorEmitter: EventEmitter<TextEditor | undefined> = new EventEmitter<TextEditor | undefined>()

    onDidChangeActiveTextEditor: Event<TextEditor | undefined> = this.onDidChangeActiveTextEditorEmitter.event

    registerCommands(commands: Commands) {
        commands.registerCommand("vscode.diff", (uri1: Uri, uri2: Uri, title: string) => {
            const textDocument = new TextDocumentImpl(uri2)
            const textEditor = new TextEditorImpl(textDocument)
            const tab = new WindowTab()
            tab.textDocument = textDocument
            tab.input = new TabInputTextDiff(uri1, uri2)
            this._tabs.push(tab)
            this.onDidChangeActiveTextEditorEmitter.fire(textEditor)
        })
    }

    showInformationMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined> {
        throw new Error("not implemented")
    }

    showErrorMessage<T extends string>(message: string, ...items: T[]): Thenable<T | undefined> {
        return new Promise<T | undefined>((resolve) => {
            // Simulate showing an error message and resolving with undefined
            console.error(message);
            resolve(undefined);
        });
    }

    showWarningMessage(...args:
        [message: string, ...items: string[]]
        | [message: string, options: MessageOptions, ...items: string[]]
    ): Thenable<string | undefined> {
        throw new Error("not implemented")
    }

    showOpenDialog(options?: OpenDialogOptions): Thenable<Uri[] | undefined> {
        throw new Error("not implemented")
    }

    showInputBox(options?: InputBoxOptions, token?: CancellationToken): Thenable<string | undefined> {
        throw new Error("not implemented")
    }

    showSaveDialog(options?: SaveDialogOptions): Thenable<Uri | undefined> {
        throw new Error("not implemented")
    }

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
    ]): Thenable<TextEditor> {
        if (args[0] instanceof Uri) {
            const uri = args[0]
            return Promise.resolve(new TextEditorImpl(new TextDocumentImpl(uri)))
        }

        const document = args[0] as TextDocument
        return Promise.resolve(new TextEditorImpl(document))
    }

    createWebviewPanel(viewType: string, title: string, showOptions: ViewColumn | {
        /**
         * The view column in which the {@link WebviewPanel} should be shown.
         */
        readonly viewColumn: ViewColumn;
        /**
         * An optional flag that when `true` will stop the panel from taking focus.
         */
        readonly preserveFocus?: boolean;
    }, options?: WebviewPanelOptions & WebviewOptions): WebviewPanel {
        throw new Error("not implemented")
    }

    createTextEditorDecorationType(options: DecorationRenderOptions): TextEditorDecorationType {
        return {}
    }

    createTerminal(options: TerminalOptions): Terminal {
        throw new Error("not implemented")
    }

    withProgress<R>(options: ProgressOptions, task: (progress: Progress<{
        message?: string;
        increment?: number;
    }>, token: CancellationToken) => Thenable<R>): Thenable<R> {
        throw new Error("not implemented")
    }
}
