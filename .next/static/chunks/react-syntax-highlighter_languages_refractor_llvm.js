"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_llvm"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/llvm.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/llvm.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = llvm\nllvm.displayName = 'llvm'\nllvm.aliases = []\nfunction llvm(Prism) {\n  ;(function (Prism) {\n    Prism.languages.llvm = {\n      comment: /;.*/,\n      string: {\n        pattern: /\"[^\"]*\"/,\n        greedy: true\n      },\n      boolean: /\\b(?:false|true)\\b/,\n      variable: /[%@!#](?:(?!\\d)(?:[-$.\\w]|\\\\[a-f\\d]{2})+|\\d+)/i,\n      label: /(?!\\d)(?:[-$.\\w]|\\\\[a-f\\d]{2})+:/i,\n      type: {\n        pattern:\n          /\\b(?:double|float|fp128|half|i[1-9]\\d*|label|metadata|ppc_fp128|token|void|x86_fp80|x86_mmx)\\b/,\n        alias: 'class-name'\n      },\n      keyword: /\\b[a-z_][a-z_0-9]*\\b/,\n      number:\n        /[+-]?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b|\\b0x[\\dA-Fa-f]+\\b|\\b0xK[\\dA-Fa-f]{20}\\b|\\b0x[ML][\\dA-Fa-f]{32}\\b|\\b0xH[\\dA-Fa-f]{4}\\b/,\n      punctuation: /[{}[\\];(),.!*=<>]/\n    }\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9sbHZtLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLHFEQUFxRCxFQUFFO0FBQ3ZELHlDQUF5QyxFQUFFO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQSxtRkFBbUYsR0FBRyxzQkFBc0IsR0FBRyxtQkFBbUIsRUFBRTtBQUNwSSx1QkFBdUIsSUFBSTtBQUMzQjtBQUNBLEdBQUc7QUFDSCIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9ub2RlX21vZHVsZXMvcmVmcmFjdG9yL2xhbmcvbGx2bS5qcz8wZTAzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxsdm1cbmxsdm0uZGlzcGxheU5hbWUgPSAnbGx2bSdcbmxsdm0uYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBsbHZtKFByaXNtKSB7XG4gIDsoZnVuY3Rpb24gKFByaXNtKSB7XG4gICAgUHJpc20ubGFuZ3VhZ2VzLmxsdm0gPSB7XG4gICAgICBjb21tZW50OiAvOy4qLyxcbiAgICAgIHN0cmluZzoge1xuICAgICAgICBwYXR0ZXJuOiAvXCJbXlwiXSpcIi8sXG4gICAgICAgIGdyZWVkeTogdHJ1ZVxuICAgICAgfSxcbiAgICAgIGJvb2xlYW46IC9cXGIoPzpmYWxzZXx0cnVlKVxcYi8sXG4gICAgICB2YXJpYWJsZTogL1slQCEjXSg/Oig/IVxcZCkoPzpbLSQuXFx3XXxcXFxcW2EtZlxcZF17Mn0pK3xcXGQrKS9pLFxuICAgICAgbGFiZWw6IC8oPyFcXGQpKD86Wy0kLlxcd118XFxcXFthLWZcXGRdezJ9KSs6L2ksXG4gICAgICB0eXBlOiB7XG4gICAgICAgIHBhdHRlcm46XG4gICAgICAgICAgL1xcYig/OmRvdWJsZXxmbG9hdHxmcDEyOHxoYWxmfGlbMS05XVxcZCp8bGFiZWx8bWV0YWRhdGF8cHBjX2ZwMTI4fHRva2VufHZvaWR8eDg2X2ZwODB8eDg2X21teClcXGIvLFxuICAgICAgICBhbGlhczogJ2NsYXNzLW5hbWUnXG4gICAgICB9LFxuICAgICAga2V5d29yZDogL1xcYlthLXpfXVthLXpfMC05XSpcXGIvLFxuICAgICAgbnVtYmVyOlxuICAgICAgICAvWystXT9cXGJcXGQrKD86XFwuXFxkKyk/KD86W2VFXVsrLV0/XFxkKyk/XFxifFxcYjB4W1xcZEEtRmEtZl0rXFxifFxcYjB4S1tcXGRBLUZhLWZdezIwfVxcYnxcXGIweFtNTF1bXFxkQS1GYS1mXXszMn1cXGJ8XFxiMHhIW1xcZEEtRmEtZl17NH1cXGIvLFxuICAgICAgcHVuY3R1YXRpb246IC9be31bXFxdOygpLC4hKj08Pl0vXG4gICAgfVxuICB9KShQcmlzbSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/llvm.js\n"));

/***/ })

}]);