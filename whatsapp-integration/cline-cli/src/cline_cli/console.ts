import { EventEmitter } from "vscode-interface"

export const log = console.log.bind(console)
export const info = console.info.bind(console)
export const debug = console.debug.bind(console)
export const warn = console.warn.bind(console)
export const error = console.error.bind(console)

let ignore = false

export function setIgnore(ignoreLog: boolean) {
    ignore = ignoreLog
}

const onLogEmitter = new EventEmitter<any[]>()
export const onLog = onLogEmitter.event
console.log = function (...args: any[]) {
    if (!ignore) {
        log(...args)
        return
    }
    onLogEmitter.fire(args)
}

const onInfoEmitter = new EventEmitter<any[]>()
export const onInfo = onInfoEmitter.event
console.info = function (...args: any[]) {
    if (!ignore) {
        info(...args)
        return
    }
    onInfoEmitter.fire(args)
}

const onDebugEmitter = new EventEmitter<any[]>()
export const onDebug = onDebugEmitter.event
console.debug = function (...args: any[]) {
    if (!ignore) {
        debug(...args)
        return
    }
    onDebugEmitter.fire(args)
}

const onWarnEmitter = new EventEmitter<any[]>()
export const onWarn = onWarnEmitter.event
console.warn = function (...args: any[]) {
    if (!ignore) {
        warn(...args)
        return
    }
    onWarnEmitter.fire(args)
}

const onErrorEmitter = new EventEmitter<any[]>()
export const onError = onErrorEmitter.event
console.error = function (...args: any[]) {
    if (!ignore) {
        error(...args)
        return
    }
    onErrorEmitter.fire(args)
}
