import { Uri } from "./uri"

/**
 * The tab represents a single text based resource.
 */
export class TabInputText {
    /**
     * The uri represented by the tab.
     */
    readonly uri: Uri;
    /**
     * Constructs a text tab input with the given URI.
     * @param uri The URI of the tab.
     */
    constructor(uri: Uri) {
        this.uri = uri;
    }
}

/**
 * The tab represents two text based resources
 * being rendered as a diff.
 */
export class TabInputTextDiff {
    /**
     * The uri of the original text resource.
     */
    readonly original: Uri;
    /**
     * The uri of the modified text resource.
     */
    readonly modified: Uri;
    /**
     * Constructs a new text diff tab input with the given URIs.
     * @param original The uri of the original text resource.
     * @param modified The uri of the modified text resource.
     */
    constructor(original: Uri, modified: Uri) {
        this.original = original;
        this.modified = modified;
    }
}
