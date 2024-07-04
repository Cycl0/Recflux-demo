"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_rego"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/rego.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/rego.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = rego\nrego.displayName = 'rego'\nrego.aliases = []\nfunction rego(Prism) {\n  // https://www.openpolicyagent.org/docs/latest/policy-reference/\n  Prism.languages.rego = {\n    comment: /#.*/,\n    property: {\n      pattern:\n        /(^|[^\\\\.])(?:\"(?:\\\\.|[^\\\\\"\\r\\n])*\"|`[^`]*`|\\b[a-z_]\\w*\\b)(?=\\s*:(?!=))/i,\n      lookbehind: true,\n      greedy: true\n    },\n    string: {\n      pattern: /(^|[^\\\\])\"(?:\\\\.|[^\\\\\"\\r\\n])*\"|`[^`]*`/,\n      lookbehind: true,\n      greedy: true\n    },\n    keyword:\n      /\\b(?:as|default|else|import|not|null|package|set(?=\\s*\\()|some|with)\\b/,\n    boolean: /\\b(?:false|true)\\b/,\n    function: {\n      pattern: /\\b[a-z_]\\w*\\b(?:\\s*\\.\\s*\\b[a-z_]\\w*\\b)*(?=\\s*\\()/i,\n      inside: {\n        namespace: /\\b\\w+\\b(?=\\s*\\.)/,\n        punctuation: /\\./\n      }\n    },\n    number: /-?\\b\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b/i,\n    operator: /[-+*/%|&]|[<>:=]=?|!=|\\b_\\b/,\n    punctuation: /[,;.\\[\\]{}()]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9yZWdvLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLHFCQUFxQixPQUFPO0FBQzVCO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL3JlZ28uanM/NzhiMCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSByZWdvXG5yZWdvLmRpc3BsYXlOYW1lID0gJ3JlZ28nXG5yZWdvLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gcmVnbyhQcmlzbSkge1xuICAvLyBodHRwczovL3d3dy5vcGVucG9saWN5YWdlbnQub3JnL2RvY3MvbGF0ZXN0L3BvbGljeS1yZWZlcmVuY2UvXG4gIFByaXNtLmxhbmd1YWdlcy5yZWdvID0ge1xuICAgIGNvbW1lbnQ6IC8jLiovLFxuICAgIHByb3BlcnR5OiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvKF58W15cXFxcLl0pKD86XCIoPzpcXFxcLnxbXlxcXFxcIlxcclxcbl0pKlwifGBbXmBdKmB8XFxiW2Etel9dXFx3KlxcYikoPz1cXHMqOig/IT0pKS9pLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvKF58W15cXFxcXSlcIig/OlxcXFwufFteXFxcXFwiXFxyXFxuXSkqXCJ8YFteYF0qYC8sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBrZXl3b3JkOlxuICAgICAgL1xcYig/OmFzfGRlZmF1bHR8ZWxzZXxpbXBvcnR8bm90fG51bGx8cGFja2FnZXxzZXQoPz1cXHMqXFwoKXxzb21lfHdpdGgpXFxiLyxcbiAgICBib29sZWFuOiAvXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLFxuICAgIGZ1bmN0aW9uOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiW2Etel9dXFx3KlxcYig/OlxccypcXC5cXHMqXFxiW2Etel9dXFx3KlxcYikqKD89XFxzKlxcKCkvaSxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBuYW1lc3BhY2U6IC9cXGJcXHcrXFxiKD89XFxzKlxcLikvLFxuICAgICAgICBwdW5jdHVhdGlvbjogL1xcLi9cbiAgICAgIH1cbiAgICB9LFxuICAgIG51bWJlcjogLy0/XFxiXFxkKyg/OlxcLlxcZCspPyg/OmVbKy1dP1xcZCspP1xcYi9pLFxuICAgIG9wZXJhdG9yOiAvWy0rKi8lfCZdfFs8Pjo9XT0/fCE9fFxcYl9cXGIvLFxuICAgIHB1bmN0dWF0aW9uOiAvWyw7LlxcW1xcXXt9KCldL1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/rego.js\n"));

/***/ })

}]);