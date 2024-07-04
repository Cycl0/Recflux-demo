"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_sml"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/sml.js":
/*!********************************************!*\
  !*** ./node_modules/refractor/lang/sml.js ***!
  \********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = sml\nsml.displayName = 'sml'\nsml.aliases = ['smlnj']\nfunction sml(Prism) {\n  // https://smlfamily.github.io/sml97-defn.pdf\n  // https://people.mpi-sws.org/~rossberg/sml.html\n  ;(function (Prism) {\n    var keywords =\n      /\\b(?:abstype|and|andalso|as|case|datatype|do|else|end|eqtype|exception|fn|fun|functor|handle|if|in|include|infix|infixr|let|local|nonfix|of|op|open|orelse|raise|rec|sharing|sig|signature|struct|structure|then|type|val|where|while|with|withtype)\\b/i\n    Prism.languages.sml = {\n      // allow one level of nesting\n      comment:\n        /\\(\\*(?:[^*(]|\\*(?!\\))|\\((?!\\*)|\\(\\*(?:[^*(]|\\*(?!\\))|\\((?!\\*))*\\*\\))*\\*\\)/,\n      string: {\n        pattern: /#?\"(?:[^\"\\\\]|\\\\.)*\"/,\n        greedy: true\n      },\n      'class-name': [\n        {\n          // This is only an approximation since the real grammar is context-free\n          //\n          // Why the main loop so complex?\n          // The main loop is approximately the same as /(?:\\s*(?:[*,]|->)\\s*<TERMINAL>)*/ which is, obviously, a lot\n          // simpler. The difference is that if a comma is the last iteration of the loop, then the terminal must be\n          // followed by a long identifier.\n          pattern: RegExp(\n            /((?:^|[^:]):\\s*)<TERMINAL>(?:\\s*(?:(?:\\*|->)\\s*<TERMINAL>|,\\s*<TERMINAL>(?:(?=<NOT-LAST>)|(?!<NOT-LAST>)\\s+<LONG-ID>)))*/.source\n              .replace(/<NOT-LAST>/g, function () {\n                return /\\s*(?:[*,]|->)/.source\n              })\n              .replace(/<TERMINAL>/g, function () {\n                return /(?:'[\\w']*|<LONG-ID>|\\((?:[^()]|\\([^()]*\\))*\\)|\\{(?:[^{}]|\\{[^{}]*\\})*\\})(?:\\s+<LONG-ID>)*/\n                  .source\n              })\n              .replace(/<LONG-ID>/g, function () {\n                return /(?!<KEYWORD>)[a-z\\d_][\\w'.]*/.source\n              })\n              .replace(/<KEYWORD>/g, function () {\n                return keywords.source\n              }),\n            'i'\n          ),\n          lookbehind: true,\n          greedy: true,\n          inside: null // see below\n        },\n        {\n          pattern:\n            /((?:^|[^\\w'])(?:datatype|exception|functor|signature|structure|type)\\s+)[a-z_][\\w'.]*/i,\n          lookbehind: true\n        }\n      ],\n      function: {\n        pattern: /((?:^|[^\\w'])fun\\s+)[a-z_][\\w'.]*/i,\n        lookbehind: true\n      },\n      keyword: keywords,\n      variable: {\n        pattern: /(^|[^\\w'])'[\\w']*/,\n        lookbehind: true\n      },\n      number: /~?\\b(?:\\d+(?:\\.\\d+)?(?:e~?\\d+)?|0x[\\da-f]+)\\b/i,\n      word: {\n        pattern: /\\b0w(?:\\d+|x[\\da-f]+)\\b/i,\n        alias: 'constant'\n      },\n      boolean: /\\b(?:false|true)\\b/i,\n      operator: /\\.\\.\\.|:[>=:]|=>?|->|[<>]=?|[!+\\-*/^#|@~]/,\n      punctuation: /[(){}\\[\\].:,;]/\n    }\n    Prism.languages.sml['class-name'][0].inside = Prism.languages.sml\n    Prism.languages.smlnj = Prism.languages.sml\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9zbWwuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQSx5RUFBeUUsT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJO0FBQ2hHO0FBQ0EsZUFBZTtBQUNmO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0EseUJBQXlCLFFBQVE7QUFDakM7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9zbWwuanM/YTFhMSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBzbWxcbnNtbC5kaXNwbGF5TmFtZSA9ICdzbWwnXG5zbWwuYWxpYXNlcyA9IFsnc21sbmonXVxuZnVuY3Rpb24gc21sKFByaXNtKSB7XG4gIC8vIGh0dHBzOi8vc21sZmFtaWx5LmdpdGh1Yi5pby9zbWw5Ny1kZWZuLnBkZlxuICAvLyBodHRwczovL3Blb3BsZS5tcGktc3dzLm9yZy9+cm9zc2Jlcmcvc21sLmh0bWxcbiAgOyhmdW5jdGlvbiAoUHJpc20pIHtcbiAgICB2YXIga2V5d29yZHMgPVxuICAgICAgL1xcYig/OmFic3R5cGV8YW5kfGFuZGFsc298YXN8Y2FzZXxkYXRhdHlwZXxkb3xlbHNlfGVuZHxlcXR5cGV8ZXhjZXB0aW9ufGZufGZ1bnxmdW5jdG9yfGhhbmRsZXxpZnxpbnxpbmNsdWRlfGluZml4fGluZml4cnxsZXR8bG9jYWx8bm9uZml4fG9mfG9wfG9wZW58b3JlbHNlfHJhaXNlfHJlY3xzaGFyaW5nfHNpZ3xzaWduYXR1cmV8c3RydWN0fHN0cnVjdHVyZXx0aGVufHR5cGV8dmFsfHdoZXJlfHdoaWxlfHdpdGh8d2l0aHR5cGUpXFxiL2lcbiAgICBQcmlzbS5sYW5ndWFnZXMuc21sID0ge1xuICAgICAgLy8gYWxsb3cgb25lIGxldmVsIG9mIG5lc3RpbmdcbiAgICAgIGNvbW1lbnQ6XG4gICAgICAgIC9cXChcXCooPzpbXiooXXxcXCooPyFcXCkpfFxcKCg/IVxcKil8XFwoXFwqKD86W14qKF18XFwqKD8hXFwpKXxcXCgoPyFcXCopKSpcXCpcXCkpKlxcKlxcKS8sXG4gICAgICBzdHJpbmc6IHtcbiAgICAgICAgcGF0dGVybjogLyM/XCIoPzpbXlwiXFxcXF18XFxcXC4pKlwiLyxcbiAgICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgICB9LFxuICAgICAgJ2NsYXNzLW5hbWUnOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIG9ubHkgYW4gYXBwcm94aW1hdGlvbiBzaW5jZSB0aGUgcmVhbCBncmFtbWFyIGlzIGNvbnRleHQtZnJlZVxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gV2h5IHRoZSBtYWluIGxvb3Agc28gY29tcGxleD9cbiAgICAgICAgICAvLyBUaGUgbWFpbiBsb29wIGlzIGFwcHJveGltYXRlbHkgdGhlIHNhbWUgYXMgLyg/OlxccyooPzpbKixdfC0+KVxccyo8VEVSTUlOQUw+KSovIHdoaWNoIGlzLCBvYnZpb3VzbHksIGEgbG90XG4gICAgICAgICAgLy8gc2ltcGxlci4gVGhlIGRpZmZlcmVuY2UgaXMgdGhhdCBpZiBhIGNvbW1hIGlzIHRoZSBsYXN0IGl0ZXJhdGlvbiBvZiB0aGUgbG9vcCwgdGhlbiB0aGUgdGVybWluYWwgbXVzdCBiZVxuICAgICAgICAgIC8vIGZvbGxvd2VkIGJ5IGEgbG9uZyBpZGVudGlmaWVyLlxuICAgICAgICAgIHBhdHRlcm46IFJlZ0V4cChcbiAgICAgICAgICAgIC8oKD86XnxbXjpdKTpcXHMqKTxURVJNSU5BTD4oPzpcXHMqKD86KD86XFwqfC0+KVxccyo8VEVSTUlOQUw+fCxcXHMqPFRFUk1JTkFMPig/Oig/PTxOT1QtTEFTVD4pfCg/ITxOT1QtTEFTVD4pXFxzKzxMT05HLUlEPikpKSovLnNvdXJjZVxuICAgICAgICAgICAgICAucmVwbGFjZSgvPE5PVC1MQVNUPi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC9cXHMqKD86WyosXXwtPikvLnNvdXJjZVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAucmVwbGFjZSgvPFRFUk1JTkFMPi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC8oPzonW1xcdyddKnw8TE9ORy1JRD58XFwoKD86W14oKV18XFwoW14oKV0qXFwpKSpcXCl8XFx7KD86W157fV18XFx7W157fV0qXFx9KSpcXH0pKD86XFxzKzxMT05HLUlEPikqL1xuICAgICAgICAgICAgICAgICAgLnNvdXJjZVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAucmVwbGFjZSgvPExPTkctSUQ+L2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLyg/ITxLRVlXT1JEPilbYS16XFxkX11bXFx3Jy5dKi8uc291cmNlXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC88S0VZV09SRD4vZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBrZXl3b3Jkcy5zb3VyY2VcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAnaSdcbiAgICAgICAgICApLFxuICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgICAgIGluc2lkZTogbnVsbCAvLyBzZWUgYmVsb3dcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHBhdHRlcm46XG4gICAgICAgICAgICAvKCg/Ol58W15cXHcnXSkoPzpkYXRhdHlwZXxleGNlcHRpb258ZnVuY3RvcnxzaWduYXR1cmV8c3RydWN0dXJlfHR5cGUpXFxzKylbYS16X11bXFx3Jy5dKi9pLFxuICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWVcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIGZ1bmN0aW9uOiB7XG4gICAgICAgIHBhdHRlcm46IC8oKD86XnxbXlxcdyddKWZ1blxccyspW2Etel9dW1xcdycuXSovaSxcbiAgICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIGtleXdvcmQ6IGtleXdvcmRzLFxuICAgICAgdmFyaWFibGU6IHtcbiAgICAgICAgcGF0dGVybjogLyhefFteXFx3J10pJ1tcXHcnXSovLFxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgICB9LFxuICAgICAgbnVtYmVyOiAvfj9cXGIoPzpcXGQrKD86XFwuXFxkKyk/KD86ZX4/XFxkKyk/fDB4W1xcZGEtZl0rKVxcYi9pLFxuICAgICAgd29yZDoge1xuICAgICAgICBwYXR0ZXJuOiAvXFxiMHcoPzpcXGQrfHhbXFxkYS1mXSspXFxiL2ksXG4gICAgICAgIGFsaWFzOiAnY29uc3RhbnQnXG4gICAgICB9LFxuICAgICAgYm9vbGVhbjogL1xcYig/OmZhbHNlfHRydWUpXFxiL2ksXG4gICAgICBvcGVyYXRvcjogL1xcLlxcLlxcLnw6Wz49Ol18PT4/fC0+fFs8Pl09P3xbIStcXC0qL14jfEB+XS8sXG4gICAgICBwdW5jdHVhdGlvbjogL1soKXt9XFxbXFxdLjosO10vXG4gICAgfVxuICAgIFByaXNtLmxhbmd1YWdlcy5zbWxbJ2NsYXNzLW5hbWUnXVswXS5pbnNpZGUgPSBQcmlzbS5sYW5ndWFnZXMuc21sXG4gICAgUHJpc20ubGFuZ3VhZ2VzLnNtbG5qID0gUHJpc20ubGFuZ3VhZ2VzLnNtbFxuICB9KShQcmlzbSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/sml.js\n"));

/***/ })

}]);