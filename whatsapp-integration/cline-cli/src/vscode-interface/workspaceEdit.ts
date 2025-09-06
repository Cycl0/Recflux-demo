import { Range } from "./range";
import { Uri } from "./uri";

/**
 * A workspace edit is a collection of textual and files changes for
 * multiple resources and documents.
 *
 * Use the {@link workspace.applyEdit applyEdit}-function to apply a workspace edit.
 */
export class WorkspaceEdit {
    uri?: Uri
    range?: Range
    newText?: string

    /**
     * Replace the given range with given text for the given resource.
     *
     * @param uri A resource identifier.
     * @param range A range.
     * @param newText A string.
     */
    replace(uri: Uri, range: Range, newText: string): void {
        this.uri = uri
        this.range = range
        this.newText = newText
    }

    /**
     * Delete the text at the given range.
     *
     * @param uri A resource identifier.
     * @param range A range.
     */
    delete(uri: Uri, range: Range): void {
        this.uri = uri
        this.range = range
        this.newText = undefined
    }
}
