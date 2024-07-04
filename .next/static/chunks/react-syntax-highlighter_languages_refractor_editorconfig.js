"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_editorconfig"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/editorconfig.js":
/*!*****************************************************!*\
  !*** ./node_modules/refractor/lang/editorconfig.js ***!
  \*****************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = editorconfig\neditorconfig.displayName = 'editorconfig'\neditorconfig.aliases = []\nfunction editorconfig(Prism) {\n  Prism.languages.editorconfig = {\n    // https://editorconfig-specification.readthedocs.io\n    comment: /[;#].*/,\n    section: {\n      pattern: /(^[ \\t]*)\\[.+\\]/m,\n      lookbehind: true,\n      alias: 'selector',\n      inside: {\n        regex: /\\\\\\\\[\\[\\]{},!?.*]/,\n        // Escape special characters with '\\\\'\n        operator: /[!?]|\\.\\.|\\*{1,2}/,\n        punctuation: /[\\[\\]{},]/\n      }\n    },\n    key: {\n      pattern: /(^[ \\t]*)[^\\s=]+(?=[ \\t]*=)/m,\n      lookbehind: true,\n      alias: 'attr-name'\n    },\n    value: {\n      pattern: /=.*/,\n      alias: 'attr-value',\n      inside: {\n        punctuation: /^=/\n      }\n    }\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9lZGl0b3Jjb25maWcuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQSxnQ0FBZ0MsSUFBSTtBQUNwQyw2QkFBNkI7QUFDN0I7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9lZGl0b3Jjb25maWcuanM/OGI4MCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0b3Jjb25maWdcbmVkaXRvcmNvbmZpZy5kaXNwbGF5TmFtZSA9ICdlZGl0b3Jjb25maWcnXG5lZGl0b3Jjb25maWcuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBlZGl0b3Jjb25maWcoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLmVkaXRvcmNvbmZpZyA9IHtcbiAgICAvLyBodHRwczovL2VkaXRvcmNvbmZpZy1zcGVjaWZpY2F0aW9uLnJlYWR0aGVkb2NzLmlvXG4gICAgY29tbWVudDogL1s7I10uKi8sXG4gICAgc2VjdGlvbjoge1xuICAgICAgcGF0dGVybjogLyheWyBcXHRdKilcXFsuK1xcXS9tLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGFsaWFzOiAnc2VsZWN0b3InLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgIHJlZ2V4OiAvXFxcXFxcXFxbXFxbXFxde30sIT8uKl0vLFxuICAgICAgICAvLyBFc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIHdpdGggJ1xcXFwnXG4gICAgICAgIG9wZXJhdG9yOiAvWyE/XXxcXC5cXC58XFwqezEsMn0vLFxuICAgICAgICBwdW5jdHVhdGlvbjogL1tcXFtcXF17fSxdL1xuICAgICAgfVxuICAgIH0sXG4gICAga2V5OiB7XG4gICAgICBwYXR0ZXJuOiAvKF5bIFxcdF0qKVteXFxzPV0rKD89WyBcXHRdKj0pL20sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgYWxpYXM6ICdhdHRyLW5hbWUnXG4gICAgfSxcbiAgICB2YWx1ZToge1xuICAgICAgcGF0dGVybjogLz0uKi8sXG4gICAgICBhbGlhczogJ2F0dHItdmFsdWUnLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgIHB1bmN0dWF0aW9uOiAvXj0vXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/editorconfig.js\n"));

/***/ })

}]);