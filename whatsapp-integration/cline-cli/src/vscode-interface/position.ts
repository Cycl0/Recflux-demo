/**
 * Represents a line and character position, such as
 * the position of the cursor.
 *
 * Position objects are __immutable__. Use the {@link Position.with with} or
 * {@link Position.translate translate} methods to derive new positions
 * from an existing position.
 */
export class Position {

    /**
     * The zero-based line value.
     */
    readonly line: number;

    /**
     * The zero-based character value.
     *
     * Character offsets are expressed using UTF-16 [code units](https://developer.mozilla.org/en-US/docs/Glossary/Code_unit).
     */
    readonly character: number;

    /**
     * @param line A zero-based line value.
     * @param character A zero-based character value.
     */
    constructor(line: number, character: number) {
        this.line = line
        this.character = character
    }

    /**
     * Create a new position relative to this position.
     *
     * @param lineDelta Delta value for the line value, default is `0`.
     * @returns A position which line and character is the sum of the current line and
     * character and the corresponding deltas.
     */
    translate(lineDelta: number): Position {
        const line = this.line + lineDelta
        return new Position(line > 0 ? line : 0, this.character)
    }
}
