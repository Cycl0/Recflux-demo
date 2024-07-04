"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-alphanumerical";
exports.ids = ["vendor-chunks/is-alphanumerical"];
exports.modules = {

/***/ "(ssr)/./node_modules/is-alphanumerical/index.js":
/*!*************************************************!*\
  !*** ./node_modules/is-alphanumerical/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar alphabetical = __webpack_require__(/*! is-alphabetical */ \"(ssr)/./node_modules/is-alphabetical/index.js\");\nvar decimal = __webpack_require__(/*! is-decimal */ \"(ssr)/./node_modules/is-decimal/index.js\");\nmodule.exports = alphanumerical;\n// Check if the given character code, or the character code at the first\n// character, is alphanumerical.\nfunction alphanumerical(character) {\n    return alphabetical(character) || decimal(character);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvaXMtYWxwaGFudW1lcmljYWwvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxlQUFlQyxtQkFBT0EsQ0FBQztBQUMzQixJQUFJQyxVQUFVRCxtQkFBT0EsQ0FBQztBQUV0QkUsT0FBT0MsT0FBTyxHQUFHQztBQUVqQix3RUFBd0U7QUFDeEUsZ0NBQWdDO0FBQ2hDLFNBQVNBLGVBQWVDLFNBQVM7SUFDL0IsT0FBT04sYUFBYU0sY0FBY0osUUFBUUk7QUFDNUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9uZXh0anMtMTMtcmVwbGl0Ly4vbm9kZV9tb2R1bGVzL2lzLWFscGhhbnVtZXJpY2FsL2luZGV4LmpzPzA3NGEiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbnZhciBhbHBoYWJldGljYWwgPSByZXF1aXJlKCdpcy1hbHBoYWJldGljYWwnKVxudmFyIGRlY2ltYWwgPSByZXF1aXJlKCdpcy1kZWNpbWFsJylcblxubW9kdWxlLmV4cG9ydHMgPSBhbHBoYW51bWVyaWNhbFxuXG4vLyBDaGVjayBpZiB0aGUgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUsIG9yIHRoZSBjaGFyYWN0ZXIgY29kZSBhdCB0aGUgZmlyc3Rcbi8vIGNoYXJhY3RlciwgaXMgYWxwaGFudW1lcmljYWwuXG5mdW5jdGlvbiBhbHBoYW51bWVyaWNhbChjaGFyYWN0ZXIpIHtcbiAgcmV0dXJuIGFscGhhYmV0aWNhbChjaGFyYWN0ZXIpIHx8IGRlY2ltYWwoY2hhcmFjdGVyKVxufVxuIl0sIm5hbWVzIjpbImFscGhhYmV0aWNhbCIsInJlcXVpcmUiLCJkZWNpbWFsIiwibW9kdWxlIiwiZXhwb3J0cyIsImFscGhhbnVtZXJpY2FsIiwiY2hhcmFjdGVyIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/is-alphanumerical/index.js\n");

/***/ })

};
;