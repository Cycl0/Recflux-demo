import type { Event } from "./types"
import { Disposable } from "./disposable"

export class EventEmitter<T> {
    private _listeners: ((e: T) => any)[] = []
    private _event?: Event<T>
    private _isDisposed: boolean = false

    get event(): Event<T> {
        if (this._event) {
            return this._event
        }

        this._event = (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]) => {
            if (this._isDisposed) {
                return new Disposable(() => { });
            }

            if (thisArgs) {
                listener = listener.bind(thisArgs);
            }

            this._listeners.push(listener);
            var disposable = new Disposable(() =>
            {
                // Remove the listener from the array
                const index = this._listeners.indexOf(listener);
                if (index !== -1) {
                    this._listeners.splice(index, 1);
                }
            });

            if (disposables) {
                disposables.push(disposable);
            }

            return disposable;
        };

        return this._event;
    }

    fire(data: T): void {
        for (const listener of this._listeners) {
            listener(data);
        }
    }

    dispose(): void {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;
        this._listeners = [];
    }
}
