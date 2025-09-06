import * as vscode from "vscode-interface"

export class SecretStorageImpl implements vscode.SecretStorage {
    private storage: Map<string, string> = new Map();

    get(key: string): vscode.Thenable<string | undefined> {
        return new Promise((resolve) => {
            resolve(this.storage.get(key));
        });
    }

    store(key: string, value: string): vscode.Thenable<void> {
        return new Promise((resolve) => {
            this.storage.set(key, value);
            resolve();
        });
    }

    delete(key: string): vscode.Thenable<void> {
        return new Promise((resolve) => {
            this.storage.delete(key);
            resolve();
        });
    }
}
