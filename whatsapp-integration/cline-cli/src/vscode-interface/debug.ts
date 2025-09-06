import type {
    DebugSession,
    DebugSessionCustomEvent,
    Event,
} from "./types";

export interface Debug {
    /**
     * An {@link Event} which fires when a new {@link DebugSession debug session} has been started.
     */
    readonly onDidStartDebugSession: Event<DebugSession>

    /**
     * An {@link Event} which fires when a custom DAP event is received from the {@link DebugSession debug session}.
     */
    readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent>

    /**
     * An {@link Event} which fires when a {@link DebugSession debug session} has terminated.
     */
    readonly onDidTerminateDebugSession: Event<DebugSession>
}

class DebugProxy implements Debug {
    private _debug?: Debug

    setDebug(debug: Debug) {
        this._debug = debug
    }

    get onDidStartDebugSession(): Event<DebugSession> { return this._debug!.onDidStartDebugSession }
    get onDidReceiveDebugSessionCustomEvent(): Event<DebugSessionCustomEvent> { return this._debug!.onDidReceiveDebugSessionCustomEvent }
    get onDidTerminateDebugSession(): Event<DebugSession> { return this._debug!.onDidTerminateDebugSession }
}

export const debug = new DebugProxy()
