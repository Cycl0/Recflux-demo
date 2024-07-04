"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_jexl"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/jexl.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/jexl.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = jexl\njexl.displayName = 'jexl'\njexl.aliases = []\nfunction jexl(Prism) {\n  Prism.languages.jexl = {\n    string: /([\"'])(?:\\\\[\\s\\S]|(?!\\1)[^\\\\])*\\1/,\n    transform: {\n      pattern:\n        /(\\|\\s*)[a-zA-Zа-яА-Я_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF$][\\wа-яА-Я\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF$]*/,\n      alias: 'function',\n      lookbehind: true\n    },\n    function:\n      /[a-zA-Zа-яА-Я_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF$][\\wа-яА-Я\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF$]*\\s*(?=\\()/,\n    number: /\\b\\d+(?:\\.\\d+)?\\b|\\B\\.\\d+\\b/,\n    operator: /[<>!]=?|-|\\+|&&|==|\\|\\|?|\\/\\/?|[?:*^%]/,\n    boolean: /\\b(?:false|true)\\b/,\n    keyword: /\\bin\\b/,\n    punctuation: /[{}[\\](),.]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9qZXhsLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2pleGwuanM/ODVjZSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBqZXhsXG5qZXhsLmRpc3BsYXlOYW1lID0gJ2pleGwnXG5qZXhsLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gamV4bChQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMuamV4bCA9IHtcbiAgICBzdHJpbmc6IC8oW1wiJ10pKD86XFxcXFtcXHNcXFNdfCg/IVxcMSlbXlxcXFxdKSpcXDEvLFxuICAgIHRyYW5zZm9ybToge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgLyhcXHxcXHMqKVthLXpBLVrQsC3Rj9CQLdCvX1xcdTAwQzAtXFx1MDBENlxcdTAwRDgtXFx1MDBGNlxcdTAwRjgtXFx1MDBGRiRdW1xcd9CwLdGP0JAt0K9cXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAwRkYkXSovLFxuICAgICAgYWxpYXM6ICdmdW5jdGlvbicsXG4gICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgfSxcbiAgICBmdW5jdGlvbjpcbiAgICAgIC9bYS16QS1a0LAt0Y/QkC3Qr19cXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAwRkYkXVtcXHfQsC3Rj9CQLdCvXFx1MDBDMC1cXHUwMEQ2XFx1MDBEOC1cXHUwMEY2XFx1MDBGOC1cXHUwMEZGJF0qXFxzKig/PVxcKCkvLFxuICAgIG51bWJlcjogL1xcYlxcZCsoPzpcXC5cXGQrKT9cXGJ8XFxCXFwuXFxkK1xcYi8sXG4gICAgb3BlcmF0b3I6IC9bPD4hXT0/fC18XFwrfCYmfD09fFxcfFxcfD98XFwvXFwvP3xbPzoqXiVdLyxcbiAgICBib29sZWFuOiAvXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLFxuICAgIGtleXdvcmQ6IC9cXGJpblxcYi8sXG4gICAgcHVuY3R1YXRpb246IC9be31bXFxdKCksLl0vXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/jexl.js\n"));

/***/ })

}]);