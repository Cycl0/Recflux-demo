"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_falselang"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/false.js":
/*!**********************************************!*\
  !*** ./node_modules/refractor/lang/false.js ***!
  \**********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = $false\n$false.displayName = '$false'\n$false.aliases = []\nfunction $false(Prism) {\n  ;(function (Prism) {\n    /**\n     * Based on the manual by Wouter van Oortmerssen.\n     *\n     * @see {@link https://github.com/PrismJS/prism/issues/2801#issue-829717504}\n     */\n    Prism.languages['false'] = {\n      comment: {\n        pattern: /\\{[^}]*\\}/\n      },\n      string: {\n        pattern: /\"[^\"]*\"/,\n        greedy: true\n      },\n      'character-code': {\n        pattern: /'(?:[^\\r]|\\r\\n?)/,\n        alias: 'number'\n      },\n      'assembler-code': {\n        pattern: /\\d+`/,\n        alias: 'important'\n      },\n      number: /\\d+/,\n      operator: /[-!#$%&'*+,./:;=>?@\\\\^_`|~ßø]/,\n      punctuation: /\\[|\\]/,\n      variable: /[a-z]/,\n      'non-standard': {\n        pattern: /[()<BDO®]/,\n        alias: 'bold'\n      }\n    }\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9mYWxzZS5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLEdBQUcsSUFBSTtBQUMzQixPQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxnQ0FBZ0M7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0giLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2ZhbHNlLmpzPzdjYTMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gJGZhbHNlXG4kZmFsc2UuZGlzcGxheU5hbWUgPSAnJGZhbHNlJ1xuJGZhbHNlLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gJGZhbHNlKFByaXNtKSB7XG4gIDsoZnVuY3Rpb24gKFByaXNtKSB7XG4gICAgLyoqXG4gICAgICogQmFzZWQgb24gdGhlIG1hbnVhbCBieSBXb3V0ZXIgdmFuIE9vcnRtZXJzc2VuLlxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL1ByaXNtSlMvcHJpc20vaXNzdWVzLzI4MDEjaXNzdWUtODI5NzE3NTA0fVxuICAgICAqL1xuICAgIFByaXNtLmxhbmd1YWdlc1snZmFsc2UnXSA9IHtcbiAgICAgIGNvbW1lbnQ6IHtcbiAgICAgICAgcGF0dGVybjogL1xce1tefV0qXFx9L1xuICAgICAgfSxcbiAgICAgIHN0cmluZzoge1xuICAgICAgICBwYXR0ZXJuOiAvXCJbXlwiXSpcIi8sXG4gICAgICAgIGdyZWVkeTogdHJ1ZVxuICAgICAgfSxcbiAgICAgICdjaGFyYWN0ZXItY29kZSc6IHtcbiAgICAgICAgcGF0dGVybjogLycoPzpbXlxccl18XFxyXFxuPykvLFxuICAgICAgICBhbGlhczogJ251bWJlcidcbiAgICAgIH0sXG4gICAgICAnYXNzZW1ibGVyLWNvZGUnOiB7XG4gICAgICAgIHBhdHRlcm46IC9cXGQrYC8sXG4gICAgICAgIGFsaWFzOiAnaW1wb3J0YW50J1xuICAgICAgfSxcbiAgICAgIG51bWJlcjogL1xcZCsvLFxuICAgICAgb3BlcmF0b3I6IC9bLSEjJCUmJyorLC4vOjs9Pj9AXFxcXF5fYHx+w5/DuF0vLFxuICAgICAgcHVuY3R1YXRpb246IC9cXFt8XFxdLyxcbiAgICAgIHZhcmlhYmxlOiAvW2Etel0vLFxuICAgICAgJ25vbi1zdGFuZGFyZCc6IHtcbiAgICAgICAgcGF0dGVybjogL1soKTxCRE/Crl0vLFxuICAgICAgICBhbGlhczogJ2JvbGQnXG4gICAgICB9XG4gICAgfVxuICB9KShQcmlzbSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/false.js\n"));

/***/ })

}]);