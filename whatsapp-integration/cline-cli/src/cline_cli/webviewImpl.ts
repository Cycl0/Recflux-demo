import * as vscode from "vscode-interface"

export class WebviewViewImpl implements vscode.WebviewView {
    viewType: string = "defaultViewType";

    constructor(public webview: vscode.Webview) {
        this.visible = true;
        this.onDidChangeVisibility = new vscode.EventEmitter<void>().event;
    }

    dispose(): void {
        this._onDidDisposeEmitter.fire()
    }

    title?: string | undefined
    description?: string | undefined
    private _onDidDisposeEmitter = new vscode.EventEmitter<void>();
    onDidDispose: vscode.Event<void> = this._onDidDisposeEmitter.event
    visible: boolean
    readonly onDidChangeVisibility: vscode.Event<void>
}

export class WebviewImpl implements vscode.Webview {
    options: vscode.WebviewOptions = {
        enableScripts: true,
        localResourceRoots: []
    };

    html: string = "";

    onDidReceiveMessageEmitter: vscode.EventEmitter<any>
    onDidReceiveMessage: vscode.Event<any>

    onPostMessageEmitter: vscode.EventEmitter<any>
    onPostMessage: vscode.Event<any>
    postMessage(message: any): vscode.Thenable<boolean> {
        return new Promise((resolve) => {
            this.onPostMessageEmitter.fire(message);
            resolve(true);
        });
    }

    asWebviewUri(localResource: vscode.Uri): vscode.Uri {
        return localResource
    }

    cspSource: string = "default-src 'self'; script-src 'self'; style-src 'self';";

    constructor() {
        this.onDidReceiveMessageEmitter = new vscode.EventEmitter<any>();
        this.onDidReceiveMessage = this.onDidReceiveMessageEmitter.event;

        this.onPostMessageEmitter = new vscode.EventEmitter<any>();
        this.onPostMessage = this.onPostMessageEmitter.event;
    }
}
