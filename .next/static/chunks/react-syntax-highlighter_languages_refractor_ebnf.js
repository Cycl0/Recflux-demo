"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_ebnf"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/ebnf.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/ebnf.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = ebnf\nebnf.displayName = 'ebnf'\nebnf.aliases = []\nfunction ebnf(Prism) {\n  Prism.languages.ebnf = {\n    comment: /\\(\\*[\\s\\S]*?\\*\\)/,\n    string: {\n      pattern: /\"[^\"\\r\\n]*\"|'[^'\\r\\n]*'/,\n      greedy: true\n    },\n    special: {\n      pattern: /\\?[^?\\r\\n]*\\?/,\n      greedy: true,\n      alias: 'class-name'\n    },\n    definition: {\n      pattern: /^([\\t ]*)[a-z]\\w*(?:[ \\t]+[a-z]\\w*)*(?=\\s*=)/im,\n      lookbehind: true,\n      alias: ['rule', 'keyword']\n    },\n    rule: /\\b[a-z]\\w*(?:[ \\t]+[a-z]\\w*)*\\b/i,\n    punctuation: /\\([:/]|[:/]\\)|[.,;()[\\]{}]/,\n    operator: /[-=|*/!]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9lYm5mLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLG9DQUFvQyxPQUFPO0FBQzNDO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9ub2RlX21vZHVsZXMvcmVmcmFjdG9yL2xhbmcvZWJuZi5qcz8wM2M0Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVibmZcbmVibmYuZGlzcGxheU5hbWUgPSAnZWJuZidcbmVibmYuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBlYm5mKFByaXNtKSB7XG4gIFByaXNtLmxhbmd1YWdlcy5lYm5mID0ge1xuICAgIGNvbW1lbnQ6IC9cXChcXCpbXFxzXFxTXSo/XFwqXFwpLyxcbiAgICBzdHJpbmc6IHtcbiAgICAgIHBhdHRlcm46IC9cIlteXCJcXHJcXG5dKlwifCdbXidcXHJcXG5dKicvLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBzcGVjaWFsOiB7XG4gICAgICBwYXR0ZXJuOiAvXFw/W14/XFxyXFxuXSpcXD8vLFxuICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgYWxpYXM6ICdjbGFzcy1uYW1lJ1xuICAgIH0sXG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgcGF0dGVybjogL14oW1xcdCBdKilbYS16XVxcdyooPzpbIFxcdF0rW2Etel1cXHcqKSooPz1cXHMqPSkvaW0sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgYWxpYXM6IFsncnVsZScsICdrZXl3b3JkJ11cbiAgICB9LFxuICAgIHJ1bGU6IC9cXGJbYS16XVxcdyooPzpbIFxcdF0rW2Etel1cXHcqKSpcXGIvaSxcbiAgICBwdW5jdHVhdGlvbjogL1xcKFs6L118WzovXVxcKXxbLiw7KClbXFxde31dLyxcbiAgICBvcGVyYXRvcjogL1stPXwqLyFdL1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/ebnf.js\n"));

/***/ })

}]);