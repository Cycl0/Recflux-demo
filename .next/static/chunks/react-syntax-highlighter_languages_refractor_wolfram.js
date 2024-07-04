"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_wolfram"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/wolfram.js":
/*!************************************************!*\
  !*** ./node_modules/refractor/lang/wolfram.js ***!
  \************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = wolfram\nwolfram.displayName = 'wolfram'\nwolfram.aliases = ['mathematica', 'wl', 'nb']\nfunction wolfram(Prism) {\n  Prism.languages.wolfram = {\n    // Allow one level of nesting - note: regex taken from applescipt\n    comment: /\\(\\*(?:\\(\\*(?:[^*]|\\*(?!\\)))*\\*\\)|(?!\\(\\*)[\\s\\S])*?\\*\\)/,\n    string: {\n      pattern: /\"(?:\\\\.|[^\"\\\\\\r\\n])*\"/,\n      greedy: true\n    },\n    keyword:\n      /\\b(?:Abs|AbsArg|Accuracy|Block|Do|For|Function|If|Manipulate|Module|Nest|NestList|None|Return|Switch|Table|Which|While)\\b/,\n    context: {\n      pattern: /\\b\\w+`+\\w*/,\n      alias: 'class-name'\n    },\n    blank: {\n      pattern: /\\b\\w+_\\b/,\n      alias: 'regex'\n    },\n    'global-variable': {\n      pattern: /\\$\\w+/,\n      alias: 'variable'\n    },\n    boolean: /\\b(?:False|True)\\b/,\n    number:\n      /(?:\\b(?=\\d)|\\B(?=\\.))(?:0[bo])?(?:(?:\\d|0x[\\da-f])[\\da-f]*(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?j?\\b/i,\n    operator:\n      /\\/\\.|;|=\\.|\\^=|\\^:=|:=|<<|>>|<\\||\\|>|:>|\\|->|->|<-|@@@|@@|@|\\/@|=!=|===|==|=|\\+|-|\\^|\\[\\/-+%=\\]=?|!=|\\*\\*?=?|\\/\\/?=?|<[<=>]?|>[=>]?|[&|^~]/,\n    punctuation: /[{}[\\];(),.:]/\n  }\n  Prism.languages.mathematica = Prism.languages.wolfram\n  Prism.languages.wl = Prism.languages.wolfram\n  Prism.languages.nb = Prism.languages.wolfram\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy93b2xmcmFtLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixxQkFBcUIsSUFBSTtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy93b2xmcmFtLmpzPzg5MzIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gd29sZnJhbVxud29sZnJhbS5kaXNwbGF5TmFtZSA9ICd3b2xmcmFtJ1xud29sZnJhbS5hbGlhc2VzID0gWydtYXRoZW1hdGljYScsICd3bCcsICduYiddXG5mdW5jdGlvbiB3b2xmcmFtKFByaXNtKSB7XG4gIFByaXNtLmxhbmd1YWdlcy53b2xmcmFtID0ge1xuICAgIC8vIEFsbG93IG9uZSBsZXZlbCBvZiBuZXN0aW5nIC0gbm90ZTogcmVnZXggdGFrZW4gZnJvbSBhcHBsZXNjaXB0XG4gICAgY29tbWVudDogL1xcKFxcKig/OlxcKFxcKig/OlteKl18XFwqKD8hXFwpKSkqXFwqXFwpfCg/IVxcKFxcKilbXFxzXFxTXSkqP1xcKlxcKS8sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvXCIoPzpcXFxcLnxbXlwiXFxcXFxcclxcbl0pKlwiLyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAga2V5d29yZDpcbiAgICAgIC9cXGIoPzpBYnN8QWJzQXJnfEFjY3VyYWN5fEJsb2NrfERvfEZvcnxGdW5jdGlvbnxJZnxNYW5pcHVsYXRlfE1vZHVsZXxOZXN0fE5lc3RMaXN0fE5vbmV8UmV0dXJufFN3aXRjaHxUYWJsZXxXaGljaHxXaGlsZSlcXGIvLFxuICAgIGNvbnRleHQ6IHtcbiAgICAgIHBhdHRlcm46IC9cXGJcXHcrYCtcXHcqLyxcbiAgICAgIGFsaWFzOiAnY2xhc3MtbmFtZSdcbiAgICB9LFxuICAgIGJsYW5rOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiXFx3K19cXGIvLFxuICAgICAgYWxpYXM6ICdyZWdleCdcbiAgICB9LFxuICAgICdnbG9iYWwtdmFyaWFibGUnOiB7XG4gICAgICBwYXR0ZXJuOiAvXFwkXFx3Ky8sXG4gICAgICBhbGlhczogJ3ZhcmlhYmxlJ1xuICAgIH0sXG4gICAgYm9vbGVhbjogL1xcYig/OkZhbHNlfFRydWUpXFxiLyxcbiAgICBudW1iZXI6XG4gICAgICAvKD86XFxiKD89XFxkKXxcXEIoPz1cXC4pKSg/OjBbYm9dKT8oPzooPzpcXGR8MHhbXFxkYS1mXSlbXFxkYS1mXSooPzpcXC5cXGQqKT98XFwuXFxkKykoPzplWystXT9cXGQrKT9qP1xcYi9pLFxuICAgIG9wZXJhdG9yOlxuICAgICAgL1xcL1xcLnw7fD1cXC58XFxePXxcXF46PXw6PXw8PHw+Pnw8XFx8fFxcfD58Oj58XFx8LT58LT58PC18QEBAfEBAfEB8XFwvQHw9IT18PT09fD09fD18XFwrfC18XFxefFxcW1xcLy0rJT1cXF09P3whPXxcXCpcXCo/PT98XFwvXFwvPz0/fDxbPD0+XT98Pls9Pl0/fFsmfF5+XS8sXG4gICAgcHVuY3R1YXRpb246IC9be31bXFxdOygpLC46XS9cbiAgfVxuICBQcmlzbS5sYW5ndWFnZXMubWF0aGVtYXRpY2EgPSBQcmlzbS5sYW5ndWFnZXMud29sZnJhbVxuICBQcmlzbS5sYW5ndWFnZXMud2wgPSBQcmlzbS5sYW5ndWFnZXMud29sZnJhbVxuICBQcmlzbS5sYW5ndWFnZXMubmIgPSBQcmlzbS5sYW5ndWFnZXMud29sZnJhbVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/wolfram.js\n"));

/***/ })

}]);