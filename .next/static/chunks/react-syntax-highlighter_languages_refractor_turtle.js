"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_turtle"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/turtle.js":
/*!***********************************************!*\
  !*** ./node_modules/refractor/lang/turtle.js ***!
  \***********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = turtle\nturtle.displayName = 'turtle'\nturtle.aliases = []\nfunction turtle(Prism) {\n  Prism.languages.turtle = {\n    comment: {\n      pattern: /#.*/,\n      greedy: true\n    },\n    'multiline-string': {\n      pattern:\n        /\"\"\"(?:(?:\"\"?)?(?:[^\"\\\\]|\\\\.))*\"\"\"|'''(?:(?:''?)?(?:[^'\\\\]|\\\\.))*'''/,\n      greedy: true,\n      alias: 'string',\n      inside: {\n        comment: /#.*/\n      }\n    },\n    string: {\n      pattern: /\"(?:[^\\\\\"\\r\\n]|\\\\.)*\"|'(?:[^\\\\'\\r\\n]|\\\\.)*'/,\n      greedy: true\n    },\n    url: {\n      pattern:\n        /<(?:[^\\x00-\\x20<>\"{}|^`\\\\]|\\\\(?:u[\\da-fA-F]{4}|U[\\da-fA-F]{8}))*>/,\n      greedy: true,\n      inside: {\n        punctuation: /[<>]/\n      }\n    },\n    function: {\n      pattern:\n        /(?:(?![-.\\d\\xB7])[-.\\w\\xB7\\xC0-\\uFFFD]+)?:(?:(?![-.])(?:[-.:\\w\\xC0-\\uFFFD]|%[\\da-f]{2}|\\\\.)+)?/i,\n      inside: {\n        'local-name': {\n          pattern: /([^:]*:)[\\s\\S]+/,\n          lookbehind: true\n        },\n        prefix: {\n          pattern: /[\\s\\S]+/,\n          inside: {\n            punctuation: /:/\n          }\n        }\n      }\n    },\n    number: /[+-]?\\b\\d+(?:\\.\\d*)?(?:e[+-]?\\d+)?/i,\n    punctuation: /[{}.,;()[\\]]|\\^\\^/,\n    boolean: /\\b(?:false|true)\\b/,\n    keyword: [/(?:\\ba|@prefix|@base)\\b|=/, /\\b(?:base|graph|prefix)\\b/i],\n    tag: {\n      pattern: /@[a-z]+(?:-[a-z\\d]+)*/i,\n      inside: {\n        punctuation: /@/\n      }\n    }\n  }\n  Prism.languages.trig = Prism.languages['turtle']\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy90dXJ0bGUuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsNkJBQTZCLHdCQUF3QixFQUFFLGFBQWEsRUFBRTtBQUN0RTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsNkZBQTZGLEVBQUU7QUFDL0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxxQkFBcUIsR0FBRztBQUN4QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy90dXJ0bGUuanM/YmU3NiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSB0dXJ0bGVcbnR1cnRsZS5kaXNwbGF5TmFtZSA9ICd0dXJ0bGUnXG50dXJ0bGUuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiB0dXJ0bGUoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLnR1cnRsZSA9IHtcbiAgICBjb21tZW50OiB7XG4gICAgICBwYXR0ZXJuOiAvIy4qLyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgJ211bHRpbGluZS1zdHJpbmcnOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvXCJcIlwiKD86KD86XCJcIj8pPyg/OlteXCJcXFxcXXxcXFxcLikpKlwiXCJcInwnJycoPzooPzonJz8pPyg/OlteJ1xcXFxdfFxcXFwuKSkqJycnLyxcbiAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgIGFsaWFzOiAnc3RyaW5nJyxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBjb21tZW50OiAvIy4qL1xuICAgICAgfVxuICAgIH0sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvXCIoPzpbXlxcXFxcIlxcclxcbl18XFxcXC4pKlwifCcoPzpbXlxcXFwnXFxyXFxuXXxcXFxcLikqJy8sXG4gICAgICBncmVlZHk6IHRydWVcbiAgICB9LFxuICAgIHVybDoge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgLzwoPzpbXlxceDAwLVxceDIwPD5cInt9fF5gXFxcXF18XFxcXCg/OnVbXFxkYS1mQS1GXXs0fXxVW1xcZGEtZkEtRl17OH0pKSo+LyxcbiAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBwdW5jdHVhdGlvbjogL1s8Pl0vXG4gICAgICB9XG4gICAgfSxcbiAgICBmdW5jdGlvbjoge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgLyg/Oig/IVstLlxcZFxceEI3XSlbLS5cXHdcXHhCN1xceEMwLVxcdUZGRkRdKyk/Oig/Oig/IVstLl0pKD86Wy0uOlxcd1xceEMwLVxcdUZGRkRdfCVbXFxkYS1mXXsyfXxcXFxcLikrKT8vaSxcbiAgICAgIGluc2lkZToge1xuICAgICAgICAnbG9jYWwtbmFtZSc6IHtcbiAgICAgICAgICBwYXR0ZXJuOiAvKFteOl0qOilbXFxzXFxTXSsvLFxuICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgcHJlZml4OiB7XG4gICAgICAgICAgcGF0dGVybjogL1tcXHNcXFNdKy8sXG4gICAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICBwdW5jdHVhdGlvbjogLzovXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBudW1iZXI6IC9bKy1dP1xcYlxcZCsoPzpcXC5cXGQqKT8oPzplWystXT9cXGQrKT8vaSxcbiAgICBwdW5jdHVhdGlvbjogL1t7fS4sOygpW1xcXV18XFxeXFxeLyxcbiAgICBib29sZWFuOiAvXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLFxuICAgIGtleXdvcmQ6IFsvKD86XFxiYXxAcHJlZml4fEBiYXNlKVxcYnw9LywgL1xcYig/OmJhc2V8Z3JhcGh8cHJlZml4KVxcYi9pXSxcbiAgICB0YWc6IHtcbiAgICAgIHBhdHRlcm46IC9AW2Etel0rKD86LVthLXpcXGRdKykqL2ksXG4gICAgICBpbnNpZGU6IHtcbiAgICAgICAgcHVuY3R1YXRpb246IC9AL1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBQcmlzbS5sYW5ndWFnZXMudHJpZyA9IFByaXNtLmxhbmd1YWdlc1sndHVydGxlJ11cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/turtle.js\n"));

/***/ })

}]);