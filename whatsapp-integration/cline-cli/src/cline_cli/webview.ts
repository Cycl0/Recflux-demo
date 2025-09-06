import * as vscode from "vscode-interface"
import { WebviewImpl } from "./webviewImpl"

let globalWebview: WebviewImpl | undefined

export function setWebview(webview: WebviewImpl) {
    globalWebview = webview
}

export function postMessageToExtension(message: any) {
    globalWebview!.onDidReceiveMessageEmitter.fire(message)
}

export function onReceiveMessageFromExtension<T>(listener: (e: T) => any, thisArgs?: any, disposables?: vscode.Disposable[]): vscode.Disposable {
    return globalWebview!.onPostMessage(listener, thisArgs, disposables)
}
