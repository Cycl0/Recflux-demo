import { Diagnostic } from "./diagnostic"
import { Disposable } from "./disposable"
import { CodeActionProvider, CodeActionProviderMetadata, DocumentSelector } from "./types"
import { Uri } from "./uri"

/**
 * Namespace for participating in language-specific editor [features](https://code.visualstudio.com/docs/editor/editingevolved),
 * like IntelliSense, code actions, diagnostics etc.
 *
 * Many programming languages exist and there is huge variety in syntaxes, semantics, and paradigms. Despite that, features
 * like automatic word-completion, code navigation, or code checking have become popular across different tools for different
 * programming languages.
 *
 * The editor provides an API that makes it simple to provide such common features by having all UI and actions already in place and
 * by allowing you to participate by providing data only. For instance, to contribute a hover all you have to do is provide a function
 * that can be called with a {@link TextDocument} and a {@link Position} returning hover info. The rest, like tracking the
 * mouse, positioning the hover, keeping the hover stable etc. is taken care of by the editor.
 *
 * ```javascript
 * languages.registerHoverProvider('javascript', {
 * 	provideHover(document, position, token) {
 * 		return new Hover('I am a hover!');
 * 	}
 * });
 * ```
 *
 * Registration is done using a {@link DocumentSelector document selector} which is either a language id, like `javascript` or
 * a more complex {@link DocumentFilter filter} like `{ language: 'typescript', scheme: 'file' }`. Matching a document against such
 * a selector will result in a {@link languages.match score} that is used to determine if and how a provider shall be used. When
 * scores are equal the provider that came last wins. For features that allow full arity, like {@link languages.registerHoverProvider hover},
 * the score is only checked to be `>0`, for other features, like {@link languages.registerCompletionItemProvider IntelliSense} the
 * score is used for determining the order in which providers are asked to participate.
 */
export interface Languages {
    /**
     * Get all diagnostics.
     *
     * @returns An array of uri-diagnostics tuples or an empty array.
     */
    getDiagnostics(): [Uri, Diagnostic[]][]
}

class LanguagesProxy implements Languages {
    private _languages?: Languages

    setLanguages(languages: Languages) {
        this._languages = languages
    }

    getDiagnostics(): [Uri, Diagnostic[]][] { return this._languages!.getDiagnostics() }
}

export const languages = new LanguagesProxy()
