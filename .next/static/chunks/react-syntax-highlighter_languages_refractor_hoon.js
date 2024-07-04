"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_hoon"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/hoon.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/hoon.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = hoon\nhoon.displayName = 'hoon'\nhoon.aliases = []\nfunction hoon(Prism) {\n  Prism.languages.hoon = {\n    comment: {\n      pattern: /::.*/,\n      greedy: true\n    },\n    string: {\n      pattern: /\"[^\"]*\"|'[^']*'/,\n      greedy: true\n    },\n    constant: /%(?:\\.[ny]|[\\w-]+)/,\n    'class-name': /@(?:[a-z0-9-]*[a-z0-9])?|\\*/i,\n    function: /(?:\\+[-+] {2})?(?:[a-z](?:[a-z0-9-]*[a-z0-9])?)/,\n    keyword:\n      /\\.[\\^\\+\\*=\\?]|![><:\\.=\\?!]|=[>|:,\\.\\-\\^<+;/~\\*\\?]|\\?[>|:\\.\\-\\^<\\+&~=@!]|\\|[\\$_%:\\.\\-\\^~\\*=@\\?]|\\+[|\\$\\+\\*]|:[_\\-\\^\\+~\\*]|%[_:\\.\\-\\^\\+~\\*=]|\\^[|:\\.\\-\\+&~\\*=\\?]|\\$[|_%:<>\\-\\^&~@=\\?]|;[:<\\+;\\/~\\*=]|~[>|\\$_%<\\+\\/&=\\?!]|--|==/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9ob29uLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSwwQkFBMEIsRUFBRTtBQUM1QjtBQUNBLGlEQUFpRCwySUFBMkksTUFBTTtBQUNsTTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9ob29uLmpzPzg4ZjEiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gaG9vblxuaG9vbi5kaXNwbGF5TmFtZSA9ICdob29uJ1xuaG9vbi5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIGhvb24oUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLmhvb24gPSB7XG4gICAgY29tbWVudDoge1xuICAgICAgcGF0dGVybjogLzo6LiovLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBzdHJpbmc6IHtcbiAgICAgIHBhdHRlcm46IC9cIlteXCJdKlwifCdbXiddKicvLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBjb25zdGFudDogLyUoPzpcXC5bbnldfFtcXHctXSspLyxcbiAgICAnY2xhc3MtbmFtZSc6IC9AKD86W2EtejAtOS1dKlthLXowLTldKT98XFwqL2ksXG4gICAgZnVuY3Rpb246IC8oPzpcXCtbLStdIHsyfSk/KD86W2Etel0oPzpbYS16MC05LV0qW2EtejAtOV0pPykvLFxuICAgIGtleXdvcmQ6XG4gICAgICAvXFwuW1xcXlxcK1xcKj1cXD9dfCFbPjw6XFwuPVxcPyFdfD1bPnw6LFxcLlxcLVxcXjwrOy9+XFwqXFw/XXxcXD9bPnw6XFwuXFwtXFxePFxcKyZ+PUAhXXxcXHxbXFwkXyU6XFwuXFwtXFxeflxcKj1AXFw/XXxcXCtbfFxcJFxcK1xcKl18OltfXFwtXFxeXFwrflxcKl18JVtfOlxcLlxcLVxcXlxcK35cXCo9XXxcXF5bfDpcXC5cXC1cXCsmflxcKj1cXD9dfFxcJFt8XyU6PD5cXC1cXF4mfkA9XFw/XXw7Wzo8XFwrO1xcL35cXCo9XXx+Wz58XFwkXyU8XFwrXFwvJj1cXD8hXXwtLXw9PS9cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/hoon.js\n"));

/***/ })

}]);