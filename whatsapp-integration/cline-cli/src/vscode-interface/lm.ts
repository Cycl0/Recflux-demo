/**
 * Namespace for language model related functionality.
 */
export namespace lm {
    /**
     * Select chat models by a {@link LanguageModelChatSelector selector}. This can yield multiple or no chat models and
     * extensions must handle these cases, esp. when no chat model exists, gracefully.
     *
     * ```ts
     * const models = await vscode.lm.selectChatModels({ family: 'gpt-3.5-turbo' });
     * if (models.length > 0) {
     * 	const [first] = models;
     * 	const response = await first.sendRequest(...)
     * 	// ...
     * } else {
     * 	// NO chat models available
     * }
     * ```
     *
     * A selector can be written to broadly match all models of a given vendor or family, or it can narrowly select one model by ID.
     * Keep in mind that the available set of models will change over time, but also that prompts may perform differently in
     * different models.
     *
     * *Note* that extensions can hold on to the results returned by this function and use them later. However, when the
     * {@link onDidChangeChatModels}-event is fired the list of chat models might have changed and extensions should re-query.
     *
     * @param selector A chat model selector. When omitted all chat models are returned.
     * @returns An array of chat models, can be empty!
     */
    export function selectChatModels(selector?: {}): Thenable<{}[]> {
        // not supported
        return Promise.resolve([])
    }
}
