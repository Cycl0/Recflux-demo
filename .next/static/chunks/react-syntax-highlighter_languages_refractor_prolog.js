"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_prolog"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/prolog.js":
/*!***********************************************!*\
  !*** ./node_modules/refractor/lang/prolog.js ***!
  \***********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = prolog\nprolog.displayName = 'prolog'\nprolog.aliases = []\nfunction prolog(Prism) {\n  Prism.languages.prolog = {\n    // Syntax depends on the implementation\n    comment: {\n      pattern: /\\/\\*[\\s\\S]*?\\*\\/|%.*/,\n      greedy: true\n    },\n    // Depending on the implementation, strings may allow escaped newlines and quote-escape\n    string: {\n      pattern: /([\"'])(?:\\1\\1|\\\\(?:\\r\\n|[\\s\\S])|(?!\\1)[^\\\\\\r\\n])*\\1(?!\\1)/,\n      greedy: true\n    },\n    builtin: /\\b(?:fx|fy|xf[xy]?|yfx?)\\b/,\n    // FIXME: Should we list all null-ary predicates (not followed by a parenthesis) like halt, trace, etc.?\n    function: /\\b[a-z]\\w*(?:(?=\\()|\\/\\d+)/,\n    number: /\\b\\d+(?:\\.\\d*)?/,\n    // Custom operators are allowed\n    operator: /[:\\\\=><\\-?*@\\/;+^|!$.]+|\\b(?:is|mod|not|xor)\\b/,\n    punctuation: /[(){}\\[\\],]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9wcm9sb2cuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEI7QUFDOUIsdUJBQXVCO0FBQ3ZCO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL3Byb2xvZy5qcz9kNjI3Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2xvZ1xucHJvbG9nLmRpc3BsYXlOYW1lID0gJ3Byb2xvZydcbnByb2xvZy5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIHByb2xvZyhQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMucHJvbG9nID0ge1xuICAgIC8vIFN5bnRheCBkZXBlbmRzIG9uIHRoZSBpbXBsZW1lbnRhdGlvblxuICAgIGNvbW1lbnQ6IHtcbiAgICAgIHBhdHRlcm46IC9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvfCUuKi8sXG4gICAgICBncmVlZHk6IHRydWVcbiAgICB9LFxuICAgIC8vIERlcGVuZGluZyBvbiB0aGUgaW1wbGVtZW50YXRpb24sIHN0cmluZ3MgbWF5IGFsbG93IGVzY2FwZWQgbmV3bGluZXMgYW5kIHF1b3RlLWVzY2FwZVxuICAgIHN0cmluZzoge1xuICAgICAgcGF0dGVybjogLyhbXCInXSkoPzpcXDFcXDF8XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8KD8hXFwxKVteXFxcXFxcclxcbl0pKlxcMSg/IVxcMSkvLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBidWlsdGluOiAvXFxiKD86Znh8Znl8eGZbeHldP3x5Zng/KVxcYi8sXG4gICAgLy8gRklYTUU6IFNob3VsZCB3ZSBsaXN0IGFsbCBudWxsLWFyeSBwcmVkaWNhdGVzIChub3QgZm9sbG93ZWQgYnkgYSBwYXJlbnRoZXNpcykgbGlrZSBoYWx0LCB0cmFjZSwgZXRjLj9cbiAgICBmdW5jdGlvbjogL1xcYlthLXpdXFx3Kig/Oig/PVxcKCl8XFwvXFxkKykvLFxuICAgIG51bWJlcjogL1xcYlxcZCsoPzpcXC5cXGQqKT8vLFxuICAgIC8vIEN1c3RvbSBvcGVyYXRvcnMgYXJlIGFsbG93ZWRcbiAgICBvcGVyYXRvcjogL1s6XFxcXD0+PFxcLT8qQFxcLzsrXnwhJC5dK3xcXGIoPzppc3xtb2R8bm90fHhvcilcXGIvLFxuICAgIHB1bmN0dWF0aW9uOiAvWygpe31cXFtcXF0sXS9cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/prolog.js\n"));

/***/ })

}]);