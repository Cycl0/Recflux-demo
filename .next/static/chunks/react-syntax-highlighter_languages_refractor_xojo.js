"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_xojo"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/xojo.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/xojo.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = xojo\nxojo.displayName = 'xojo'\nxojo.aliases = []\nfunction xojo(Prism) {\n  Prism.languages.xojo = {\n    comment: {\n      pattern: /(?:'|\\/\\/|Rem\\b).+/i,\n      greedy: true\n    },\n    string: {\n      pattern: /\"(?:\"\"|[^\"])*\"/,\n      greedy: true\n    },\n    number: [/(?:\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+)(?:E[+-]?\\d+)?/i, /&[bchou][a-z\\d]+/i],\n    directive: {\n      pattern: /#(?:Else|ElseIf|Endif|If|Pragma)\\b/i,\n      alias: 'property'\n    },\n    keyword:\n      /\\b(?:AddHandler|App|Array|As(?:signs)?|Auto|Boolean|Break|By(?:Ref|Val)|Byte|Call|Case|Catch|CFStringRef|CGFloat|Class|Color|Const|Continue|CString|Currency|CurrentMethodName|Declare|Delegate|Dim|Do(?:uble|wnTo)?|Each|Else(?:If)?|End|Enumeration|Event|Exception|Exit|Extends|False|Finally|For|Function|Get|GetTypeInfo|Global|GOTO|If|Implements|In|Inherits|Int(?:8|16|32|64|eger|erface)?|Lib|Loop|Me|Module|Next|Nil|Object|Optional|OSType|ParamArray|Private|Property|Protected|PString|Ptr|Raise(?:Event)?|ReDim|RemoveHandler|Return|Select(?:or)?|Self|Set|Shared|Short|Single|Soft|Static|Step|String|Sub|Super|Text|Then|To|True|Try|Ubound|UInt(?:8|16|32|64|eger)?|Until|Using|Var(?:iant)?|Wend|While|WindowPtr|WString)\\b/i,\n    operator:\n      /<[=>]?|>=?|[+\\-*\\/\\\\^=]|\\b(?:AddressOf|And|Ctype|IsA?|Mod|New|Not|Or|WeakAddressOf|Xor)\\b/i,\n    punctuation: /[.,;:()]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy94b2pvLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL3hvam8uanM/MDk5MCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSB4b2pvXG54b2pvLmRpc3BsYXlOYW1lID0gJ3hvam8nXG54b2pvLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24geG9qbyhQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMueG9qbyA9IHtcbiAgICBjb21tZW50OiB7XG4gICAgICBwYXR0ZXJuOiAvKD86J3xcXC9cXC98UmVtXFxiKS4rL2ksXG4gICAgICBncmVlZHk6IHRydWVcbiAgICB9LFxuICAgIHN0cmluZzoge1xuICAgICAgcGF0dGVybjogL1wiKD86XCJcInxbXlwiXSkqXCIvLFxuICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgfSxcbiAgICBudW1iZXI6IFsvKD86XFxiXFxkKyg/OlxcLlxcZCopP3xcXEJcXC5cXGQrKSg/OkVbKy1dP1xcZCspPy9pLCAvJltiY2hvdV1bYS16XFxkXSsvaV0sXG4gICAgZGlyZWN0aXZlOiB7XG4gICAgICBwYXR0ZXJuOiAvIyg/OkVsc2V8RWxzZUlmfEVuZGlmfElmfFByYWdtYSlcXGIvaSxcbiAgICAgIGFsaWFzOiAncHJvcGVydHknXG4gICAgfSxcbiAgICBrZXl3b3JkOlxuICAgICAgL1xcYig/OkFkZEhhbmRsZXJ8QXBwfEFycmF5fEFzKD86c2lnbnMpP3xBdXRvfEJvb2xlYW58QnJlYWt8QnkoPzpSZWZ8VmFsKXxCeXRlfENhbGx8Q2FzZXxDYXRjaHxDRlN0cmluZ1JlZnxDR0Zsb2F0fENsYXNzfENvbG9yfENvbnN0fENvbnRpbnVlfENTdHJpbmd8Q3VycmVuY3l8Q3VycmVudE1ldGhvZE5hbWV8RGVjbGFyZXxEZWxlZ2F0ZXxEaW18RG8oPzp1YmxlfHduVG8pP3xFYWNofEVsc2UoPzpJZik/fEVuZHxFbnVtZXJhdGlvbnxFdmVudHxFeGNlcHRpb258RXhpdHxFeHRlbmRzfEZhbHNlfEZpbmFsbHl8Rm9yfEZ1bmN0aW9ufEdldHxHZXRUeXBlSW5mb3xHbG9iYWx8R09UT3xJZnxJbXBsZW1lbnRzfElufEluaGVyaXRzfEludCg/Ojh8MTZ8MzJ8NjR8ZWdlcnxlcmZhY2UpP3xMaWJ8TG9vcHxNZXxNb2R1bGV8TmV4dHxOaWx8T2JqZWN0fE9wdGlvbmFsfE9TVHlwZXxQYXJhbUFycmF5fFByaXZhdGV8UHJvcGVydHl8UHJvdGVjdGVkfFBTdHJpbmd8UHRyfFJhaXNlKD86RXZlbnQpP3xSZURpbXxSZW1vdmVIYW5kbGVyfFJldHVybnxTZWxlY3QoPzpvcik/fFNlbGZ8U2V0fFNoYXJlZHxTaG9ydHxTaW5nbGV8U29mdHxTdGF0aWN8U3RlcHxTdHJpbmd8U3VifFN1cGVyfFRleHR8VGhlbnxUb3xUcnVlfFRyeXxVYm91bmR8VUludCg/Ojh8MTZ8MzJ8NjR8ZWdlcik/fFVudGlsfFVzaW5nfFZhcig/OmlhbnQpP3xXZW5kfFdoaWxlfFdpbmRvd1B0cnxXU3RyaW5nKVxcYi9pLFxuICAgIG9wZXJhdG9yOlxuICAgICAgLzxbPT5dP3w+PT98WytcXC0qXFwvXFxcXF49XXxcXGIoPzpBZGRyZXNzT2Z8QW5kfEN0eXBlfElzQT98TW9kfE5ld3xOb3R8T3J8V2Vha0FkZHJlc3NPZnxYb3IpXFxiL2ksXG4gICAgcHVuY3R1YXRpb246IC9bLiw7OigpXS9cbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/xojo.js\n"));

/***/ })

}]);