"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_processing"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/processing.js":
/*!***************************************************!*\
  !*** ./node_modules/refractor/lang/processing.js ***!
  \***************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = processing\nprocessing.displayName = 'processing'\nprocessing.aliases = []\nfunction processing(Prism) {\n  Prism.languages.processing = Prism.languages.extend('clike', {\n    keyword:\n      /\\b(?:break|case|catch|class|continue|default|else|extends|final|for|if|implements|import|new|null|private|public|return|static|super|switch|this|try|void|while)\\b/,\n    // Spaces are allowed between function name and parenthesis\n    function: /\\b\\w+(?=\\s*\\()/,\n    operator: /<[<=]?|>[>=]?|&&?|\\|\\|?|[%?]|[!=+\\-*\\/]=?/\n  })\n  Prism.languages.insertBefore('processing', 'number', {\n    // Special case: XML is a type\n    constant: /\\b(?!XML\\b)[A-Z][A-Z\\d_]+\\b/,\n    type: {\n      pattern: /\\b(?:boolean|byte|char|color|double|float|int|[A-Z]\\w*)\\b/,\n      alias: 'class-name'\n    }\n  })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9wcm9jZXNzaW5nLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9wcm9jZXNzaW5nLmpzPzdhNzYiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gcHJvY2Vzc2luZ1xucHJvY2Vzc2luZy5kaXNwbGF5TmFtZSA9ICdwcm9jZXNzaW5nJ1xucHJvY2Vzc2luZy5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIHByb2Nlc3NpbmcoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLnByb2Nlc3NpbmcgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcbiAgICBrZXl3b3JkOlxuICAgICAgL1xcYig/OmJyZWFrfGNhc2V8Y2F0Y2h8Y2xhc3N8Y29udGludWV8ZGVmYXVsdHxlbHNlfGV4dGVuZHN8ZmluYWx8Zm9yfGlmfGltcGxlbWVudHN8aW1wb3J0fG5ld3xudWxsfHByaXZhdGV8cHVibGljfHJldHVybnxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dHJ5fHZvaWR8d2hpbGUpXFxiLyxcbiAgICAvLyBTcGFjZXMgYXJlIGFsbG93ZWQgYmV0d2VlbiBmdW5jdGlvbiBuYW1lIGFuZCBwYXJlbnRoZXNpc1xuICAgIGZ1bmN0aW9uOiAvXFxiXFx3Kyg/PVxccypcXCgpLyxcbiAgICBvcGVyYXRvcjogLzxbPD1dP3w+Wz49XT98JiY/fFxcfFxcfD98WyU/XXxbIT0rXFwtKlxcL109Py9cbiAgfSlcbiAgUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncHJvY2Vzc2luZycsICdudW1iZXInLCB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBYTUwgaXMgYSB0eXBlXG4gICAgY29uc3RhbnQ6IC9cXGIoPyFYTUxcXGIpW0EtWl1bQS1aXFxkX10rXFxiLyxcbiAgICB0eXBlOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiKD86Ym9vbGVhbnxieXRlfGNoYXJ8Y29sb3J8ZG91YmxlfGZsb2F0fGludHxbQS1aXVxcdyopXFxiLyxcbiAgICAgIGFsaWFzOiAnY2xhc3MtbmFtZSdcbiAgICB9XG4gIH0pXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/processing.js\n"));

/***/ })

}]);