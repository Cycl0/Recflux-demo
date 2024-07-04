"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_bbcode"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/bbcode.js":
/*!***********************************************!*\
  !*** ./node_modules/refractor/lang/bbcode.js ***!
  \***********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = bbcode\nbbcode.displayName = 'bbcode'\nbbcode.aliases = ['shortcode']\nfunction bbcode(Prism) {\n  Prism.languages.bbcode = {\n    tag: {\n      pattern:\n        /\\[\\/?[^\\s=\\]]+(?:\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\"\\]=]+))?(?:\\s+[^\\s=\\]]+\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\"\\]=]+))*\\s*\\]/,\n      inside: {\n        tag: {\n          pattern: /^\\[\\/?[^\\s=\\]]+/,\n          inside: {\n            punctuation: /^\\[\\/?/\n          }\n        },\n        'attr-value': {\n          pattern: /=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\"\\]=]+)/,\n          inside: {\n            punctuation: [\n              /^=/,\n              {\n                pattern: /^(\\s*)[\"']|[\"']$/,\n                lookbehind: true\n              }\n            ]\n          }\n        },\n        punctuation: /\\]/,\n        'attr-name': /[^\\s=\\]]+/\n      }\n    }\n  }\n  Prism.languages.shortcode = Prism.languages.bbcode\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9iYmNvZGUuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9iYmNvZGUuanM/MGMwOSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBiYmNvZGVcbmJiY29kZS5kaXNwbGF5TmFtZSA9ICdiYmNvZGUnXG5iYmNvZGUuYWxpYXNlcyA9IFsnc2hvcnRjb2RlJ11cbmZ1bmN0aW9uIGJiY29kZShQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMuYmJjb2RlID0ge1xuICAgIHRhZzoge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgL1xcW1xcLz9bXlxccz1cXF1dKyg/Olxccyo9XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIlxcXT1dKykpPyg/OlxccytbXlxccz1cXF1dK1xccyo9XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIlxcXT1dKykpKlxccypcXF0vLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgIHRhZzoge1xuICAgICAgICAgIHBhdHRlcm46IC9eXFxbXFwvP1teXFxzPVxcXV0rLyxcbiAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgIHB1bmN0dWF0aW9uOiAvXlxcW1xcLz8vXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnYXR0ci12YWx1ZSc6IHtcbiAgICAgICAgICBwYXR0ZXJuOiAvPVxccyooPzpcIlteXCJdKlwifCdbXiddKid8W15cXHMnXCJcXF09XSspLyxcbiAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgIHB1bmN0dWF0aW9uOiBbXG4gICAgICAgICAgICAgIC9ePS8sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBwYXR0ZXJuOiAvXihcXHMqKVtcIiddfFtcIiddJC8sXG4gICAgICAgICAgICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwdW5jdHVhdGlvbjogL1xcXS8sXG4gICAgICAgICdhdHRyLW5hbWUnOiAvW15cXHM9XFxdXSsvXG4gICAgICB9XG4gICAgfVxuICB9XG4gIFByaXNtLmxhbmd1YWdlcy5zaG9ydGNvZGUgPSBQcmlzbS5sYW5ndWFnZXMuYmJjb2RlXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/bbcode.js\n"));

/***/ })

}]);