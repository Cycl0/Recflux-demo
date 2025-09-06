import type {
    Diagnostic,
    Languages,
    Uri,
} from "vscode-interface"

export class LanguagesImpl implements Languages {
    /**
     * Get all diagnostics.
     *
     * @returns An array of uri-diagnostics tuples or an empty array.
     */
    getDiagnostics(): [Uri, Diagnostic[]][] {
        // not supported
        return []
    }
}
