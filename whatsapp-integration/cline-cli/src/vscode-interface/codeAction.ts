import type { Command } from "./types";

/**
 * Kind of a code action.
 *
 * Kinds are a hierarchical list of identifiers separated by `.`, e.g. `"refactor.extract.function"`.
 *
 * Code action kinds are used by the editor for UI elements such as the refactoring context menu. Users
 * can also trigger code actions with a specific kind with the `editor.action.codeAction` command.
 */
export class CodeActionKind {

    /**
     * Base kind for quickfix actions: `quickfix`.
     *
     * Quick fix actions address a problem in the code and are shown in the normal code action context menu.
     */
    static readonly QuickFix: CodeActionKind = new CodeActionKind()
}

/**
 * A code action represents a change that can be performed in code, e.g. to fix a problem or
 * to refactor code.
 *
 * A CodeAction must set either {@linkcode CodeAction.edit edit} and/or a {@linkcode CodeAction.command command}. If both are supplied, the `edit` is applied first, then the command is executed.
 */
export class CodeAction {
    /**
     * A {@link Command} this code action executes.
     *
     * If this command throws an exception, the editor displays the exception message to users in the editor at the
     * current cursor position.
     */
    command?: Command;

    /**
     * Creates a new code action.
     *
     * A code action must have at least a {@link CodeAction.title title} and {@link CodeAction.edit edits}
     * and/or a {@link CodeAction.command command}.
     *
     * @param title The title of the code action.
     * @param kind The kind of the code action.
     */
    constructor(title: string, kind?: CodeActionKind) {
        // do nothing
    }
}
