"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_mizar"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/mizar.js":
/*!**********************************************!*\
  !*** ./node_modules/refractor/lang/mizar.js ***!
  \**********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = mizar\nmizar.displayName = 'mizar'\nmizar.aliases = []\nfunction mizar(Prism) {\n  Prism.languages.mizar = {\n    comment: /::.+/,\n    keyword:\n      /@proof\\b|\\b(?:according|aggregate|all|and|antonym|are|as|associativity|assume|asymmetry|attr|be|begin|being|by|canceled|case|cases|clusters?|coherence|commutativity|compatibility|connectedness|consider|consistency|constructors|contradiction|correctness|def|deffunc|define|definitions?|defpred|do|does|end|environ|equals|ex|exactly|existence|for|from|func|given|hence|hereby|holds|idempotence|identity|iff?|implies|involutiveness|irreflexivity|is|it|let|means|mode|non|not|notations?|now|of|or|otherwise|over|per|pred|prefix|projectivity|proof|provided|qua|reconsider|redefine|reduce|reducibility|reflexivity|registrations?|requirements|reserve|sch|schemes?|section|selector|set|sethood|st|struct|such|suppose|symmetry|synonym|take|that|the|then|theorems?|thesis|thus|to|transitivity|uniqueness|vocabular(?:ies|y)|when|where|with|wrt)\\b/,\n    parameter: {\n      pattern: /\\$(?:10|\\d)/,\n      alias: 'variable'\n    },\n    variable: /\\b\\w+(?=:)/,\n    number: /(?:\\b|-)\\d+\\b/,\n    operator: /\\.\\.\\.|->|&|\\.?=/,\n    punctuation: /\\(#|#\\)|[,:;\\[\\](){}]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9taXphci5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QixRQUFRO0FBQ3RDO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL21pemFyLmpzPzZkODMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gbWl6YXJcbm1pemFyLmRpc3BsYXlOYW1lID0gJ21pemFyJ1xubWl6YXIuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBtaXphcihQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMubWl6YXIgPSB7XG4gICAgY29tbWVudDogLzo6LisvLFxuICAgIGtleXdvcmQ6XG4gICAgICAvQHByb29mXFxifFxcYig/OmFjY29yZGluZ3xhZ2dyZWdhdGV8YWxsfGFuZHxhbnRvbnltfGFyZXxhc3xhc3NvY2lhdGl2aXR5fGFzc3VtZXxhc3ltbWV0cnl8YXR0cnxiZXxiZWdpbnxiZWluZ3xieXxjYW5jZWxlZHxjYXNlfGNhc2VzfGNsdXN0ZXJzP3xjb2hlcmVuY2V8Y29tbXV0YXRpdml0eXxjb21wYXRpYmlsaXR5fGNvbm5lY3RlZG5lc3N8Y29uc2lkZXJ8Y29uc2lzdGVuY3l8Y29uc3RydWN0b3JzfGNvbnRyYWRpY3Rpb258Y29ycmVjdG5lc3N8ZGVmfGRlZmZ1bmN8ZGVmaW5lfGRlZmluaXRpb25zP3xkZWZwcmVkfGRvfGRvZXN8ZW5kfGVudmlyb258ZXF1YWxzfGV4fGV4YWN0bHl8ZXhpc3RlbmNlfGZvcnxmcm9tfGZ1bmN8Z2l2ZW58aGVuY2V8aGVyZWJ5fGhvbGRzfGlkZW1wb3RlbmNlfGlkZW50aXR5fGlmZj98aW1wbGllc3xpbnZvbHV0aXZlbmVzc3xpcnJlZmxleGl2aXR5fGlzfGl0fGxldHxtZWFuc3xtb2RlfG5vbnxub3R8bm90YXRpb25zP3xub3d8b2Z8b3J8b3RoZXJ3aXNlfG92ZXJ8cGVyfHByZWR8cHJlZml4fHByb2plY3Rpdml0eXxwcm9vZnxwcm92aWRlZHxxdWF8cmVjb25zaWRlcnxyZWRlZmluZXxyZWR1Y2V8cmVkdWNpYmlsaXR5fHJlZmxleGl2aXR5fHJlZ2lzdHJhdGlvbnM/fHJlcXVpcmVtZW50c3xyZXNlcnZlfHNjaHxzY2hlbWVzP3xzZWN0aW9ufHNlbGVjdG9yfHNldHxzZXRob29kfHN0fHN0cnVjdHxzdWNofHN1cHBvc2V8c3ltbWV0cnl8c3lub255bXx0YWtlfHRoYXR8dGhlfHRoZW58dGhlb3JlbXM/fHRoZXNpc3x0aHVzfHRvfHRyYW5zaXRpdml0eXx1bmlxdWVuZXNzfHZvY2FidWxhcig/Omllc3x5KXx3aGVufHdoZXJlfHdpdGh8d3J0KVxcYi8sXG4gICAgcGFyYW1ldGVyOiB7XG4gICAgICBwYXR0ZXJuOiAvXFwkKD86MTB8XFxkKS8sXG4gICAgICBhbGlhczogJ3ZhcmlhYmxlJ1xuICAgIH0sXG4gICAgdmFyaWFibGU6IC9cXGJcXHcrKD89OikvLFxuICAgIG51bWJlcjogLyg/OlxcYnwtKVxcZCtcXGIvLFxuICAgIG9wZXJhdG9yOiAvXFwuXFwuXFwufC0+fCZ8XFwuPz0vLFxuICAgIHB1bmN0dWF0aW9uOiAvXFwoI3wjXFwpfFssOjtcXFtcXF0oKXt9XS9cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/mizar.js\n"));

/***/ })

}]);