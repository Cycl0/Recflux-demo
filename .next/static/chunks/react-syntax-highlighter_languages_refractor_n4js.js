"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_n4js"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/n4js.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/n4js.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = n4js\nn4js.displayName = 'n4js'\nn4js.aliases = ['n4jsd']\nfunction n4js(Prism) {\n  Prism.languages.n4js = Prism.languages.extend('javascript', {\n    // Keywords from N4JS language spec: https://numberfour.github.io/n4js/spec/N4JSSpec.html\n    keyword:\n      /\\b(?:Array|any|boolean|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|module|new|null|number|package|private|protected|public|return|set|static|string|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\\b/\n  })\n  Prism.languages.insertBefore('n4js', 'constant', {\n    // Annotations in N4JS spec: https://numberfour.github.io/n4js/spec/N4JSSpec.html#_annotations\n    annotation: {\n      pattern: /@+\\w+/,\n      alias: 'operator'\n    }\n  })\n  Prism.languages.n4jsd = Prism.languages.n4js\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9uNGpzLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL240anMuanM/MmEyYyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBuNGpzXG5uNGpzLmRpc3BsYXlOYW1lID0gJ240anMnXG5uNGpzLmFsaWFzZXMgPSBbJ240anNkJ11cbmZ1bmN0aW9uIG40anMoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLm40anMgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdqYXZhc2NyaXB0Jywge1xuICAgIC8vIEtleXdvcmRzIGZyb20gTjRKUyBsYW5ndWFnZSBzcGVjOiBodHRwczovL251bWJlcmZvdXIuZ2l0aHViLmlvL240anMvc3BlYy9ONEpTU3BlYy5odG1sXG4gICAga2V5d29yZDpcbiAgICAgIC9cXGIoPzpBcnJheXxhbnl8Ym9vbGVhbnxicmVha3xjYXNlfGNhdGNofGNsYXNzfGNvbnN0fGNvbnN0cnVjdG9yfGNvbnRpbnVlfGRlYnVnZ2VyfGRlY2xhcmV8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZhbHNlfGZpbmFsbHl8Zm9yfGZyb218ZnVuY3Rpb258Z2V0fGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxtb2R1bGV8bmV3fG51bGx8bnVtYmVyfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzZXR8c3RhdGljfHN0cmluZ3xzdXBlcnxzd2l0Y2h8dGhpc3x0aHJvd3x0cnVlfHRyeXx0eXBlb2Z8dmFyfHZvaWR8d2hpbGV8d2l0aHx5aWVsZClcXGIvXG4gIH0pXG4gIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ240anMnLCAnY29uc3RhbnQnLCB7XG4gICAgLy8gQW5ub3RhdGlvbnMgaW4gTjRKUyBzcGVjOiBodHRwczovL251bWJlcmZvdXIuZ2l0aHViLmlvL240anMvc3BlYy9ONEpTU3BlYy5odG1sI19hbm5vdGF0aW9uc1xuICAgIGFubm90YXRpb246IHtcbiAgICAgIHBhdHRlcm46IC9AK1xcdysvLFxuICAgICAgYWxpYXM6ICdvcGVyYXRvcidcbiAgICB9XG4gIH0pXG4gIFByaXNtLmxhbmd1YWdlcy5uNGpzZCA9IFByaXNtLmxhbmd1YWdlcy5uNGpzXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/n4js.js\n"));

/***/ })

}]);