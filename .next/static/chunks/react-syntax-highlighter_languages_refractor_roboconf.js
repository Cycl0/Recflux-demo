"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_roboconf"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/roboconf.js":
/*!*************************************************!*\
  !*** ./node_modules/refractor/lang/roboconf.js ***!
  \*************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = roboconf\nroboconf.displayName = 'roboconf'\nroboconf.aliases = []\nfunction roboconf(Prism) {\n  Prism.languages.roboconf = {\n    comment: /#.*/,\n    keyword: {\n      pattern:\n        /(^|\\s)(?:(?:external|import)\\b|(?:facet|instance of)(?=[ \\t]+[\\w-]+[ \\t]*\\{))/,\n      lookbehind: true\n    },\n    component: {\n      pattern: /[\\w-]+(?=[ \\t]*\\{)/,\n      alias: 'variable'\n    },\n    property: /[\\w.-]+(?=[ \\t]*:)/,\n    value: {\n      pattern: /(=[ \\t]*(?![ \\t]))[^,;]+/,\n      lookbehind: true,\n      alias: 'attr-value'\n    },\n    optional: {\n      pattern: /\\(optional\\)/,\n      alias: 'builtin'\n    },\n    wildcard: {\n      pattern: /(\\.)\\*/,\n      lookbehind: true,\n      alias: 'operator'\n    },\n    punctuation: /[{},.;:=]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9yb2JvY29uZi5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0ZBQW9GO0FBQ3BGO0FBQ0EsS0FBSztBQUNMO0FBQ0EsaUNBQWlDO0FBQ2pDO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxzQ0FBc0M7QUFDdEM7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wscUJBQXFCLEdBQUc7QUFDeEI7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9ub2RlX21vZHVsZXMvcmVmcmFjdG9yL2xhbmcvcm9ib2NvbmYuanM/ZTg2YSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSByb2JvY29uZlxucm9ib2NvbmYuZGlzcGxheU5hbWUgPSAncm9ib2NvbmYnXG5yb2JvY29uZi5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIHJvYm9jb25mKFByaXNtKSB7XG4gIFByaXNtLmxhbmd1YWdlcy5yb2JvY29uZiA9IHtcbiAgICBjb21tZW50OiAvIy4qLyxcbiAgICBrZXl3b3JkOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvKF58XFxzKSg/Oig/OmV4dGVybmFsfGltcG9ydClcXGJ8KD86ZmFjZXR8aW5zdGFuY2Ugb2YpKD89WyBcXHRdK1tcXHctXStbIFxcdF0qXFx7KSkvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgY29tcG9uZW50OiB7XG4gICAgICBwYXR0ZXJuOiAvW1xcdy1dKyg/PVsgXFx0XSpcXHspLyxcbiAgICAgIGFsaWFzOiAndmFyaWFibGUnXG4gICAgfSxcbiAgICBwcm9wZXJ0eTogL1tcXHcuLV0rKD89WyBcXHRdKjopLyxcbiAgICB2YWx1ZToge1xuICAgICAgcGF0dGVybjogLyg9WyBcXHRdKig/IVsgXFx0XSkpW14sO10rLyxcbiAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICBhbGlhczogJ2F0dHItdmFsdWUnXG4gICAgfSxcbiAgICBvcHRpb25hbDoge1xuICAgICAgcGF0dGVybjogL1xcKG9wdGlvbmFsXFwpLyxcbiAgICAgIGFsaWFzOiAnYnVpbHRpbidcbiAgICB9LFxuICAgIHdpbGRjYXJkOiB7XG4gICAgICBwYXR0ZXJuOiAvKFxcLilcXCovLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGFsaWFzOiAnb3BlcmF0b3InXG4gICAgfSxcbiAgICBwdW5jdHVhdGlvbjogL1t7fSwuOzo9XS9cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/roboconf.js\n"));

/***/ })

}]);