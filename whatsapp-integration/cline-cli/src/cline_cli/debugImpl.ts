import {
    DebugSession,
    EventEmitter,
    Event,
    DebugSessionCustomEvent,
} from "vscode-interface";


/**
 * Namespace for debug functionality.
 */
export class DebugImpl {
    readonly onDidStartDebugSessionEmitter: EventEmitter<DebugSession> = new EventEmitter<DebugSession>();

    /**
     * An {@link Event} which fires when a new {@link DebugSession debug session} has been started.
     */
    readonly onDidStartDebugSession: Event<DebugSession> = this.onDidStartDebugSessionEmitter.event

    readonly onDidReceiveDebugSessionCustomEventEmitter: EventEmitter<DebugSessionCustomEvent> = new EventEmitter<DebugSessionCustomEvent>()

    /**
     * An {@link Event} which fires when a custom DAP event is received from the {@link DebugSession debug session}.
     */
    readonly onDidReceiveDebugSessionCustomEvent: Event<DebugSessionCustomEvent> = this.onDidReceiveDebugSessionCustomEventEmitter.event

    readonly onDidTerminateDebugSessionEmitter: EventEmitter<DebugSession> = new EventEmitter<DebugSession>();

    /**
     * An {@link Event} which fires when a {@link DebugSession debug session} has terminated.
     */
    readonly onDidTerminateDebugSession: Event<DebugSession> = this.onDidTerminateDebugSessionEmitter.event
}
