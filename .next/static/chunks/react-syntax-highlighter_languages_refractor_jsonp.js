"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_jsonp"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/json.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/json.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = json\njson.displayName = 'json'\njson.aliases = ['webmanifest']\nfunction json(Prism) {\n  // https://www.json.org/json-en.html\n  Prism.languages.json = {\n    property: {\n      pattern: /(^|[^\\\\])\"(?:\\\\.|[^\\\\\"\\r\\n])*\"(?=\\s*:)/,\n      lookbehind: true,\n      greedy: true\n    },\n    string: {\n      pattern: /(^|[^\\\\])\"(?:\\\\.|[^\\\\\"\\r\\n])*\"(?!\\s*:)/,\n      lookbehind: true,\n      greedy: true\n    },\n    comment: {\n      pattern: /\\/\\/.*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)/,\n      greedy: true\n    },\n    number: /-?\\b\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b/i,\n    punctuation: /[{}[\\],]/,\n    operator: /:/,\n    boolean: /\\b(?:false|true)\\b/,\n    null: {\n      pattern: /\\bnull\\b/,\n      alias: 'keyword'\n    }\n  }\n  Prism.languages.webmanifest = Prism.languages.json\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9qc29uLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2pzb24uanM/MjAyOSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBqc29uXG5qc29uLmRpc3BsYXlOYW1lID0gJ2pzb24nXG5qc29uLmFsaWFzZXMgPSBbJ3dlYm1hbmlmZXN0J11cbmZ1bmN0aW9uIGpzb24oUHJpc20pIHtcbiAgLy8gaHR0cHM6Ly93d3cuanNvbi5vcmcvanNvbi1lbi5odG1sXG4gIFByaXNtLmxhbmd1YWdlcy5qc29uID0ge1xuICAgIHByb3BlcnR5OiB7XG4gICAgICBwYXR0ZXJuOiAvKF58W15cXFxcXSlcIig/OlxcXFwufFteXFxcXFwiXFxyXFxuXSkqXCIoPz1cXHMqOikvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvKF58W15cXFxcXSlcIig/OlxcXFwufFteXFxcXFwiXFxyXFxuXSkqXCIoPyFcXHMqOikvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgY29tbWVudDoge1xuICAgICAgcGF0dGVybjogL1xcL1xcLy4qfFxcL1xcKltcXHNcXFNdKj8oPzpcXCpcXC98JCkvLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBudW1iZXI6IC8tP1xcYlxcZCsoPzpcXC5cXGQrKT8oPzplWystXT9cXGQrKT9cXGIvaSxcbiAgICBwdW5jdHVhdGlvbjogL1t7fVtcXF0sXS8sXG4gICAgb3BlcmF0b3I6IC86LyxcbiAgICBib29sZWFuOiAvXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLFxuICAgIG51bGw6IHtcbiAgICAgIHBhdHRlcm46IC9cXGJudWxsXFxiLyxcbiAgICAgIGFsaWFzOiAna2V5d29yZCdcbiAgICB9XG4gIH1cbiAgUHJpc20ubGFuZ3VhZ2VzLndlYm1hbmlmZXN0ID0gUHJpc20ubGFuZ3VhZ2VzLmpzb25cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/json.js\n"));

/***/ }),

/***/ "(app-pages-browser)/./node_modules/refractor/lang/jsonp.js":
/*!**********************************************!*\
  !*** ./node_modules/refractor/lang/jsonp.js ***!
  \**********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\nvar refractorJson = __webpack_require__(/*! ./json.js */ \"(app-pages-browser)/./node_modules/refractor/lang/json.js\")\nmodule.exports = jsonp\njsonp.displayName = 'jsonp'\njsonp.aliases = []\nfunction jsonp(Prism) {\n  Prism.register(refractorJson)\n  Prism.languages.jsonp = Prism.languages.extend('json', {\n    punctuation: /[{}[\\]();,.]/\n  })\n  Prism.languages.insertBefore('jsonp', 'punctuation', {\n    function: /(?!\\s)[_$a-zA-Z\\xA0-\\uFFFF](?:(?!\\s)[$\\w\\xA0-\\uFFFF])*(?=\\s*\\()/\n  })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9qc29ucC5qcyIsIm1hcHBpbmdzIjoiQUFBWTtBQUNaLG9CQUFvQixtQkFBTyxDQUFDLDRFQUFXO0FBQ3ZDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQixNQUFNO0FBQzNCLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9qc29ucC5qcz81YThhIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xudmFyIHJlZnJhY3Rvckpzb24gPSByZXF1aXJlKCcuL2pzb24uanMnKVxubW9kdWxlLmV4cG9ydHMgPSBqc29ucFxuanNvbnAuZGlzcGxheU5hbWUgPSAnanNvbnAnXG5qc29ucC5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIGpzb25wKFByaXNtKSB7XG4gIFByaXNtLnJlZ2lzdGVyKHJlZnJhY3Rvckpzb24pXG4gIFByaXNtLmxhbmd1YWdlcy5qc29ucCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2pzb24nLCB7XG4gICAgcHVuY3R1YXRpb246IC9be31bXFxdKCk7LC5dL1xuICB9KVxuICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdqc29ucCcsICdwdW5jdHVhdGlvbicsIHtcbiAgICBmdW5jdGlvbjogLyg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqXFwoKS9cbiAgfSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/jsonp.js\n"));

/***/ })

}]);