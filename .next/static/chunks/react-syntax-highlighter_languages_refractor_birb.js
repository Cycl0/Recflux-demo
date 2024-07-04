"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_birb"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/birb.js":
/*!*********************************************!*\
  !*** ./node_modules/refractor/lang/birb.js ***!
  \*********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = birb\nbirb.displayName = 'birb'\nbirb.aliases = []\nfunction birb(Prism) {\n  Prism.languages.birb = Prism.languages.extend('clike', {\n    string: {\n      pattern: /r?(\"|')(?:\\\\.|(?!\\1)[^\\\\])*\\1/,\n      greedy: true\n    },\n    'class-name': [\n      /\\b[A-Z](?:[\\d_]*[a-zA-Z]\\w*)?\\b/, // matches variable and function return types (parameters as well).\n      /\\b(?:[A-Z]\\w*|(?!(?:var|void)\\b)[a-z]\\w*)(?=\\s+\\w+\\s*[;,=()])/\n    ],\n    keyword:\n      /\\b(?:assert|break|case|class|const|default|else|enum|final|follows|for|grab|if|nest|new|next|noSeeb|return|static|switch|throw|var|void|while)\\b/,\n    operator: /\\+\\+|--|&&|\\|\\||<<=?|>>=?|~(?:\\/=?)?|[+\\-*\\/%&^|=!<>]=?|\\?|:/,\n    variable: /\\b[a-z_]\\w*\\b/\n  })\n  Prism.languages.insertBefore('birb', 'function', {\n    metadata: {\n      pattern: /<\\w+>/,\n      greedy: true,\n      alias: 'symbol'\n    }\n  })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9iaXJiLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLDhEQUE4RDtBQUM5RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSCIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9ub2RlX21vZHVsZXMvcmVmcmFjdG9yL2xhbmcvYmlyYi5qcz9hM2M2Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJpcmJcbmJpcmIuZGlzcGxheU5hbWUgPSAnYmlyYidcbmJpcmIuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBiaXJiKFByaXNtKSB7XG4gIFByaXNtLmxhbmd1YWdlcy5iaXJiID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvcj8oXCJ8JykoPzpcXFxcLnwoPyFcXDEpW15cXFxcXSkqXFwxLyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgJ2NsYXNzLW5hbWUnOiBbXG4gICAgICAvXFxiW0EtWl0oPzpbXFxkX10qW2EtekEtWl1cXHcqKT9cXGIvLCAvLyBtYXRjaGVzIHZhcmlhYmxlIGFuZCBmdW5jdGlvbiByZXR1cm4gdHlwZXMgKHBhcmFtZXRlcnMgYXMgd2VsbCkuXG4gICAgICAvXFxiKD86W0EtWl1cXHcqfCg/ISg/OnZhcnx2b2lkKVxcYilbYS16XVxcdyopKD89XFxzK1xcdytcXHMqWzssPSgpXSkvXG4gICAgXSxcbiAgICBrZXl3b3JkOlxuICAgICAgL1xcYig/OmFzc2VydHxicmVha3xjYXNlfGNsYXNzfGNvbnN0fGRlZmF1bHR8ZWxzZXxlbnVtfGZpbmFsfGZvbGxvd3N8Zm9yfGdyYWJ8aWZ8bmVzdHxuZXd8bmV4dHxub1NlZWJ8cmV0dXJufHN0YXRpY3xzd2l0Y2h8dGhyb3d8dmFyfHZvaWR8d2hpbGUpXFxiLyxcbiAgICBvcGVyYXRvcjogL1xcK1xcK3wtLXwmJnxcXHxcXHx8PDw9P3w+Pj0/fH4oPzpcXC89Pyk/fFsrXFwtKlxcLyUmXnw9ITw+XT0/fFxcP3w6LyxcbiAgICB2YXJpYWJsZTogL1xcYlthLXpfXVxcdypcXGIvXG4gIH0pXG4gIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2JpcmInLCAnZnVuY3Rpb24nLCB7XG4gICAgbWV0YWRhdGE6IHtcbiAgICAgIHBhdHRlcm46IC88XFx3Kz4vLFxuICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgYWxpYXM6ICdzeW1ib2wnXG4gICAgfVxuICB9KVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/birb.js\n"));

/***/ })

}]);