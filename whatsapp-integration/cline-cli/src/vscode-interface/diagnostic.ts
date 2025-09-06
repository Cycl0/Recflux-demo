import { Range } from "./range"

/**
 * Represents the severity of diagnostics.
 */
export enum DiagnosticSeverity {

    /**
     * Something not allowed by the rules of a language or other means.
     */
    Error = 0,

    /**
     * Something suspicious but allowed.
     */
    Warning = 1,

    /**
     * Something to inform about but not a problem.
     */
    Information = 2,

    /**
     * Something to hint to a better way of doing it, like proposing
     * a refactoring.
     */
    Hint = 3
}

/**
 * Additional metadata about the type of a diagnostic.
 */
export enum DiagnosticTag {
    /**
     * Unused or unnecessary code.
     *
     * Diagnostics with this tag are rendered faded out. The amount of fading
     * is controlled by the `"editorUnnecessaryCode.opacity"` theme color. For
     * example, `"editorUnnecessaryCode.opacity": "#000000c0"` will render the
     * code with 75% opacity. For high contrast themes, use the
     * `"editorUnnecessaryCode.border"` theme color to underline unnecessary code
     * instead of fading it out.
     */
    Unnecessary = 1,

    /**
     * Deprecated or obsolete code.
     *
     * Diagnostics with this tag are rendered with a strike through.
     */
    Deprecated = 2,
}

/**
 * Represents a diagnostic, such as a compiler error or warning. Diagnostic objects
 * are only valid in the scope of a file.
 */
export class Diagnostic {

    /**
     * The range to which this diagnostic applies.
     */
    range: Range;

    /**
     * The human-readable message.
     */
    message: string;

    /**
     * The severity, default is {@link DiagnosticSeverity.Error error}.
     */
    severity: DiagnosticSeverity;

    /**
     * A human-readable string describing the source of this
     * diagnostic, e.g. 'typescript' or 'super lint'.
     */
    source?: string;

    /**
     * Creates a new diagnostic object.
     *
     * @param range The range to which this diagnostic applies.
     * @param message The human-readable message.
     * @param severity The severity, default is {@link DiagnosticSeverity.Error error}.
     */
    constructor(range: Range, message: string, severity?: DiagnosticSeverity) {
        this.range = range
        this.message = message
        this.severity = severity ?? DiagnosticSeverity.Error
    }
}
