"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_goModule"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/go-module.js":
/*!**************************************************!*\
  !*** ./node_modules/refractor/lang/go-module.js ***!
  \**************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = goModule\ngoModule.displayName = 'goModule'\ngoModule.aliases = []\nfunction goModule(Prism) {\n  // https://go.dev/ref/mod#go-mod-file-module\n  Prism.languages['go-mod'] = Prism.languages['go-module'] = {\n    comment: {\n      pattern: /\\/\\/.*/,\n      greedy: true\n    },\n    version: {\n      pattern: /(^|[\\s()[\\],])v\\d+\\.\\d+\\.\\d+(?:[+-][-+.\\w]*)?(?![^\\s()[\\],])/,\n      lookbehind: true,\n      alias: 'number'\n    },\n    'go-version': {\n      pattern: /((?:^|\\s)go\\s+)\\d+(?:\\.\\d+){1,2}/,\n      lookbehind: true,\n      alias: 'number'\n    },\n    keyword: {\n      pattern: /^([ \\t]*)(?:exclude|go|module|replace|require|retract)\\b/m,\n      lookbehind: true\n    },\n    operator: /=>/,\n    punctuation: /[()[\\],]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9nby1tb2R1bGUuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsNENBQTRDLElBQUk7QUFDaEQ7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2dvLW1vZHVsZS5qcz85Mjk2Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdvTW9kdWxlXG5nb01vZHVsZS5kaXNwbGF5TmFtZSA9ICdnb01vZHVsZSdcbmdvTW9kdWxlLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gZ29Nb2R1bGUoUHJpc20pIHtcbiAgLy8gaHR0cHM6Ly9nby5kZXYvcmVmL21vZCNnby1tb2QtZmlsZS1tb2R1bGVcbiAgUHJpc20ubGFuZ3VhZ2VzWydnby1tb2QnXSA9IFByaXNtLmxhbmd1YWdlc1snZ28tbW9kdWxlJ10gPSB7XG4gICAgY29tbWVudDoge1xuICAgICAgcGF0dGVybjogL1xcL1xcLy4qLyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgdmVyc2lvbjoge1xuICAgICAgcGF0dGVybjogLyhefFtcXHMoKVtcXF0sXSl2XFxkK1xcLlxcZCtcXC5cXGQrKD86WystXVstKy5cXHddKik/KD8hW15cXHMoKVtcXF0sXSkvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGFsaWFzOiAnbnVtYmVyJ1xuICAgIH0sXG4gICAgJ2dvLXZlcnNpb24nOiB7XG4gICAgICBwYXR0ZXJuOiAvKCg/Ol58XFxzKWdvXFxzKylcXGQrKD86XFwuXFxkKyl7MSwyfS8sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgYWxpYXM6ICdudW1iZXInXG4gICAgfSxcbiAgICBrZXl3b3JkOiB7XG4gICAgICBwYXR0ZXJuOiAvXihbIFxcdF0qKSg/OmV4Y2x1ZGV8Z298bW9kdWxlfHJlcGxhY2V8cmVxdWlyZXxyZXRyYWN0KVxcYi9tLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgb3BlcmF0b3I6IC89Pi8sXG4gICAgcHVuY3R1YXRpb246IC9bKClbXFxdLF0vXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/go-module.js\n"));

/***/ })

}]);