import { Position } from "./position"

/**
 * A range represents an ordered pair of two positions.
 * It is guaranteed that {@link Range.start start}.isBeforeOrEqual({@link Range.end end})
 *
 * Range objects are __immutable__. Use the {@link Range.with with},
 * {@link Range.intersection intersection}, or {@link Range.union union} methods
 * to derive new ranges from an existing range.
 */
export class Range {

    /**
     * The start position. It is before or equal to {@link Range.end end}.
     */
    readonly start: Position;

    /**
     * The end position. It is after or equal to {@link Range.start start}.
     */
    readonly end: Position;

    /**
     * Create a new range from two positions. If `start` is not
     * before or equal to `end`, the values will be swapped.
     *
     * @param start A position.
     * @param end A position.
     */
    /**
     * Create a new range from number coordinates. It is a shorter equivalent of
     * using `new Range(new Position(startLine, startCharacter), new Position(endLine, endCharacter))`
     *
     * @param startLine A zero-based line value.
     * @param startCharacter A zero-based character value.
     * @param endLine A zero-based line value.
     * @param endCharacter A zero-based character value.
     */
    constructor(...args: [
        /**
         * A position.
         */
        start: Position,
        /**
         * A position.
         */
        end: Position
    ] | [
        /**
         * A zero-based line value.
         */
        startLine: number,
        /**
         * A zero-based character value.
         */
        startCharacter: number,
        /**
         * A zero-based line value.
         */
        endLine: number,
        /**
         * A zero-based character value.
         */
        endCharacter: number
    ]) {
        if (args.length === 2) {
            this.start = args[0]
            this.end = args[1]
        }
        else {
            this.start = new Position(args[0], args[1])
            this.end = new Position(args[2], args[3])
        }
    }

    /**
     * Derived a new range from this range.
     *
     * @param start A position that should be used as start. The default value is the {@link Range.start current start}.
     * @param end A position that should be used as end. The default value is the {@link Range.end current end}.
     * @returns A range derived from this range with the given start and end position.
     * If start and end are not different `this` range will be returned.
     */
    with(start?: Position, end?: Position): Range {
        return new Range(start ?? this.start, end ?? this.end)
    }
}

/**
 * Represents a text selection in an editor.
 */
export class Selection extends Range {
    /**
     * Create a selection from two positions.
     *
     * @param anchor A position.
     * @param active A position.
     */
    constructor(anchor: Position, active: Position) {
        super(anchor, active);
    }
}
