import * as vscode from "vscode-interface"

export class MementoImpl implements vscode.Memento {
    private storage: Map<string, string> = new Map();

    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        if (this.storage.has(key)) {
            const json = this.storage.get(key)!
            return JSON.parse(json) as T;
        }
        return defaultValue;
    }

    update(key: string, value: any): vscode.Thenable<void> {
        return new Promise((resolve) => {
            const json = JSON.stringify(value)
            this.storage.set(key, json);
            resolve();
        });
    }
}
