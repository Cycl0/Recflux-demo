import { URI, Utils } from "vscode-uri"

/**
 * A universal resource identifier representing either a file on disk
 * or another resource, like untitled resources.
 */
export class Uri {
    private readonly _uri: URI

    /**
     * scheme is the 'http' part of 'http://www.example.com/some/path?query#fragment'.
     * The part before the first colon.
     */
    get scheme(): string {
        return this._uri.scheme
    }

    /**
     * Returns a string representing the corresponding file system path of this URI.
     * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
     * platform specific path separator.
     *
     * * Will *not* validate the path for invalid characters and semantics.
     * * Will *not* look at the scheme of this URI.
     * * The result shall *not* be used for display purposes but for accessing a file on disk.
     *
     *
     * The *difference* to `URI#path` is the use of the platform specific separator and the handling
     * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
     *
     * ```ts
        const u = URI.parse('file://server/c$/folder/file.txt')
        u.authority === 'server'
        u.path === '/shares/c$/file.txt'
        u.fsPath === '\\server\c$\folder\file.txt'
    ```
     *
     * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
     * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
     * with URIs that represent files on disk (`file` scheme).
     */
    get fsPath(): string {
        return this._uri.fsPath
    }

    with(change: {
        scheme?: string;
        authority?: string | null;
        path?: string | null;
        query?: string | null;
        fragment?: string | null;
    }): Uri {
        return new Uri(this._uri.with(change))
    }

    /**
     * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
     * `file:///usr/home`, or `scheme:with/path`.
     *
     * @param value A string which represents an URI (see `URI#toString`).
     */
    static parse(value: string, _strict?: boolean): Uri {
        return new Uri(URI.parse(value, _strict))
    }

    /**
     * Creates a new URI from a file system path, e.g. `c:\my\files`,
     * `/usr/home`, or `\\server\share\some\path`.
     *
     * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
     * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
     * `URI.parse('file://' + path)` because the path might contain characters that are
     * interpreted (# and ?). See the following sample:
     * ```ts
    const good = URI.file('/coding/c#/project1');
    good.scheme === 'file';
    good.path === '/coding/c#/project1';
    good.fragment === '';
    const bad = URI.parse('file://' + '/coding/c#/project1');
    bad.scheme === 'file';
    bad.path === '/coding/c'; // path is now broken
    bad.fragment === '/project1';
    ```
     *
     * @param path A file system path (see `URI#fsPath`)
     */
    static file(path: string): Uri {
        return new Uri(URI.file(path))
    }

    /**
     * Create a new uri which path is the result of joining
     * the path of the base uri with the provided path segments.
     *
     * - Note 1: `joinPath` only affects the path component
     * and all other components (scheme, authority, query, and fragment) are
     * left as they are.
     * - Note 2: The base uri must have a path; an error is thrown otherwise.
     *
     * The path segments are normalized in the following ways:
     * - sequences of path separators (`/` or `\`) are replaced with a single separator
     * - for `file`-uris on windows, the backslash-character (`\`) is considered a path-separator
     * - the `..`-segment denotes the parent segment, the `.` denotes the current segment
     * - paths have a root which always remains, for instance on windows drive-letters are roots
     * so that is true: `joinPath(Uri.file('file:///c:/root'), '../../other').fsPath === 'c:/other'`
     *
     * @param base An uri. Must have a path.
     * @param pathSegments One more more path fragments
     * @returns A new uri which path is joined with the given fragments
     */
    static joinPath(base: Uri, ...pathSegments: string[]): Uri {
        const uri = Utils.joinPath(base._uri, ...pathSegments)
        return new Uri(uri)
    }

    private constructor(uri: URI) {
        this._uri = uri
    }
}
