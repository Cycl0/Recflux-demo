"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_nevod"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/nevod.js":
/*!**********************************************!*\
  !*** ./node_modules/refractor/lang/nevod.js ***!
  \**********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = nevod\nnevod.displayName = 'nevod'\nnevod.aliases = []\nfunction nevod(Prism) {\n  Prism.languages.nevod = {\n    comment: /\\/\\/.*|(?:\\/\\*[\\s\\S]*?(?:\\*\\/|$))/,\n    string: {\n      pattern: /(?:\"(?:\"\"|[^\"])*\"(?!\")|'(?:''|[^'])*'(?!'))!?\\*?/,\n      greedy: true,\n      inside: {\n        'string-attrs': /!$|!\\*$|\\*$/\n      }\n    },\n    namespace: {\n      pattern: /(@namespace\\s+)[a-zA-Z0-9\\-.]+(?=\\s*\\{)/,\n      lookbehind: true\n    },\n    pattern: {\n      pattern:\n        /(@pattern\\s+)?#?[a-zA-Z0-9\\-.]+(?:\\s*\\(\\s*(?:~\\s*)?[a-zA-Z0-9\\-.]+\\s*(?:,\\s*(?:~\\s*)?[a-zA-Z0-9\\-.]*)*\\))?(?=\\s*=)/,\n      lookbehind: true,\n      inside: {\n        'pattern-name': {\n          pattern: /^#?[a-zA-Z0-9\\-.]+/,\n          alias: 'class-name'\n        },\n        fields: {\n          pattern: /\\(.*\\)/,\n          inside: {\n            'field-name': {\n              pattern: /[a-zA-Z0-9\\-.]+/,\n              alias: 'variable'\n            },\n            punctuation: /[,()]/,\n            operator: {\n              pattern: /~/,\n              alias: 'field-hidden-mark'\n            }\n          }\n        }\n      }\n    },\n    search: {\n      pattern: /(@search\\s+|#)[a-zA-Z0-9\\-.]+(?:\\.\\*)?(?=\\s*;)/,\n      alias: 'function',\n      lookbehind: true\n    },\n    keyword:\n      /@(?:having|inside|namespace|outside|pattern|require|search|where)\\b/,\n    'standard-pattern': {\n      pattern:\n        /\\b(?:Alpha|AlphaNum|Any|Blank|End|LineBreak|Num|NumAlpha|Punct|Space|Start|Symbol|Word|WordBreak)\\b(?:\\([a-zA-Z0-9\\-.,\\s+]*\\))?/,\n      inside: {\n        'standard-pattern-name': {\n          pattern: /^[a-zA-Z0-9\\-.]+/,\n          alias: 'builtin'\n        },\n        quantifier: {\n          pattern: /\\b\\d+(?:\\s*\\+|\\s*-\\s*\\d+)?(?!\\w)/,\n          alias: 'number'\n        },\n        'standard-pattern-attr': {\n          pattern: /[a-zA-Z0-9\\-.]+/,\n          alias: 'builtin'\n        },\n        punctuation: /[,()]/\n      }\n    },\n    quantifier: {\n      pattern: /\\b\\d+(?:\\s*\\+|\\s*-\\s*\\d+)?(?!\\w)/,\n      alias: 'number'\n    },\n    operator: [\n      {\n        pattern: /=/,\n        alias: 'pattern-def'\n      },\n      {\n        pattern: /&/,\n        alias: 'conjunction'\n      },\n      {\n        pattern: /~/,\n        alias: 'exception'\n      },\n      {\n        pattern: /\\?/,\n        alias: 'optionality'\n      },\n      {\n        pattern: /[[\\]]/,\n        alias: 'repetition'\n      },\n      {\n        pattern: /[{}]/,\n        alias: 'variation'\n      },\n      {\n        pattern: /[+_]/,\n        alias: 'sequence'\n      },\n      {\n        pattern: /\\.{2,3}/,\n        alias: 'span'\n      }\n    ],\n    'field-capture': [\n      {\n        pattern:\n          /([a-zA-Z0-9\\-.]+\\s*\\()\\s*[a-zA-Z0-9\\-.]+\\s*:\\s*[a-zA-Z0-9\\-.]+(?:\\s*,\\s*[a-zA-Z0-9\\-.]+\\s*:\\s*[a-zA-Z0-9\\-.]+)*(?=\\s*\\))/,\n        lookbehind: true,\n        inside: {\n          'field-name': {\n            pattern: /[a-zA-Z0-9\\-.]+/,\n            alias: 'variable'\n          },\n          colon: /:/\n        }\n      },\n      {\n        pattern: /[a-zA-Z0-9\\-.]+\\s*:/,\n        inside: {\n          'field-name': {\n            pattern: /[a-zA-Z0-9\\-.]+/,\n            alias: 'variable'\n          },\n          colon: /:/\n        }\n      }\n    ],\n    punctuation: /[:;,()]/,\n    name: /[a-zA-Z0-9\\-.]+/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9uZXZvZC5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxzREFBc0Q7QUFDdEQ7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLDZEQUE2RDtBQUM3RDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxxQkFBcUIsSUFBSTtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9uZXZvZC5qcz8xMWM4Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldm9kXG5uZXZvZC5kaXNwbGF5TmFtZSA9ICduZXZvZCdcbm5ldm9kLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gbmV2b2QoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLm5ldm9kID0ge1xuICAgIGNvbW1lbnQ6IC9cXC9cXC8uKnwoPzpcXC9cXCpbXFxzXFxTXSo/KD86XFwqXFwvfCQpKS8sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvKD86XCIoPzpcIlwifFteXCJdKSpcIig/IVwiKXwnKD86Jyd8W14nXSkqJyg/IScpKSE/XFwqPy8sXG4gICAgICBncmVlZHk6IHRydWUsXG4gICAgICBpbnNpZGU6IHtcbiAgICAgICAgJ3N0cmluZy1hdHRycyc6IC8hJHwhXFwqJHxcXCokL1xuICAgICAgfVxuICAgIH0sXG4gICAgbmFtZXNwYWNlOiB7XG4gICAgICBwYXR0ZXJuOiAvKEBuYW1lc3BhY2VcXHMrKVthLXpBLVowLTlcXC0uXSsoPz1cXHMqXFx7KS8sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgfSxcbiAgICBwYXR0ZXJuOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvKEBwYXR0ZXJuXFxzKyk/Iz9bYS16QS1aMC05XFwtLl0rKD86XFxzKlxcKFxccyooPzp+XFxzKik/W2EtekEtWjAtOVxcLS5dK1xccyooPzosXFxzKig/On5cXHMqKT9bYS16QS1aMC05XFwtLl0qKSpcXCkpPyg/PVxccyo9KS8sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgICdwYXR0ZXJuLW5hbWUnOiB7XG4gICAgICAgICAgcGF0dGVybjogL14jP1thLXpBLVowLTlcXC0uXSsvLFxuICAgICAgICAgIGFsaWFzOiAnY2xhc3MtbmFtZSdcbiAgICAgICAgfSxcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgcGF0dGVybjogL1xcKC4qXFwpLyxcbiAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgICdmaWVsZC1uYW1lJzoge1xuICAgICAgICAgICAgICBwYXR0ZXJuOiAvW2EtekEtWjAtOVxcLS5dKy8sXG4gICAgICAgICAgICAgIGFsaWFzOiAndmFyaWFibGUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHVuY3R1YXRpb246IC9bLCgpXS8sXG4gICAgICAgICAgICBvcGVyYXRvcjoge1xuICAgICAgICAgICAgICBwYXR0ZXJuOiAvfi8sXG4gICAgICAgICAgICAgIGFsaWFzOiAnZmllbGQtaGlkZGVuLW1hcmsnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBzZWFyY2g6IHtcbiAgICAgIHBhdHRlcm46IC8oQHNlYXJjaFxccyt8IylbYS16QS1aMC05XFwtLl0rKD86XFwuXFwqKT8oPz1cXHMqOykvLFxuICAgICAgYWxpYXM6ICdmdW5jdGlvbicsXG4gICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgfSxcbiAgICBrZXl3b3JkOlxuICAgICAgL0AoPzpoYXZpbmd8aW5zaWRlfG5hbWVzcGFjZXxvdXRzaWRlfHBhdHRlcm58cmVxdWlyZXxzZWFyY2h8d2hlcmUpXFxiLyxcbiAgICAnc3RhbmRhcmQtcGF0dGVybic6IHtcbiAgICAgIHBhdHRlcm46XG4gICAgICAgIC9cXGIoPzpBbHBoYXxBbHBoYU51bXxBbnl8Qmxhbmt8RW5kfExpbmVCcmVha3xOdW18TnVtQWxwaGF8UHVuY3R8U3BhY2V8U3RhcnR8U3ltYm9sfFdvcmR8V29yZEJyZWFrKVxcYig/OlxcKFthLXpBLVowLTlcXC0uLFxccytdKlxcKSk/LyxcbiAgICAgIGluc2lkZToge1xuICAgICAgICAnc3RhbmRhcmQtcGF0dGVybi1uYW1lJzoge1xuICAgICAgICAgIHBhdHRlcm46IC9eW2EtekEtWjAtOVxcLS5dKy8sXG4gICAgICAgICAgYWxpYXM6ICdidWlsdGluJ1xuICAgICAgICB9LFxuICAgICAgICBxdWFudGlmaWVyOiB7XG4gICAgICAgICAgcGF0dGVybjogL1xcYlxcZCsoPzpcXHMqXFwrfFxccyotXFxzKlxcZCspPyg/IVxcdykvLFxuICAgICAgICAgIGFsaWFzOiAnbnVtYmVyJ1xuICAgICAgICB9LFxuICAgICAgICAnc3RhbmRhcmQtcGF0dGVybi1hdHRyJzoge1xuICAgICAgICAgIHBhdHRlcm46IC9bYS16QS1aMC05XFwtLl0rLyxcbiAgICAgICAgICBhbGlhczogJ2J1aWx0aW4nXG4gICAgICAgIH0sXG4gICAgICAgIHB1bmN0dWF0aW9uOiAvWywoKV0vXG4gICAgICB9XG4gICAgfSxcbiAgICBxdWFudGlmaWVyOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiXFxkKyg/OlxccypcXCt8XFxzKi1cXHMqXFxkKyk/KD8hXFx3KS8sXG4gICAgICBhbGlhczogJ251bWJlcidcbiAgICB9LFxuICAgIG9wZXJhdG9yOiBbXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC89LyxcbiAgICAgICAgYWxpYXM6ICdwYXR0ZXJuLWRlZidcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC8mLyxcbiAgICAgICAgYWxpYXM6ICdjb25qdW5jdGlvbidcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC9+LyxcbiAgICAgICAgYWxpYXM6ICdleGNlcHRpb24nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBwYXR0ZXJuOiAvXFw/LyxcbiAgICAgICAgYWxpYXM6ICdvcHRpb25hbGl0eSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC9bW1xcXV0vLFxuICAgICAgICBhbGlhczogJ3JlcGV0aXRpb24nXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBwYXR0ZXJuOiAvW3t9XS8sXG4gICAgICAgIGFsaWFzOiAndmFyaWF0aW9uJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogL1srX10vLFxuICAgICAgICBhbGlhczogJ3NlcXVlbmNlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcLnsyLDN9LyxcbiAgICAgICAgYWxpYXM6ICdzcGFuJ1xuICAgICAgfVxuICAgIF0sXG4gICAgJ2ZpZWxkLWNhcHR1cmUnOiBbXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46XG4gICAgICAgICAgLyhbYS16QS1aMC05XFwtLl0rXFxzKlxcKClcXHMqW2EtekEtWjAtOVxcLS5dK1xccyo6XFxzKlthLXpBLVowLTlcXC0uXSsoPzpcXHMqLFxccypbYS16QS1aMC05XFwtLl0rXFxzKjpcXHMqW2EtekEtWjAtOVxcLS5dKykqKD89XFxzKlxcKSkvLFxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAnZmllbGQtbmFtZSc6IHtcbiAgICAgICAgICAgIHBhdHRlcm46IC9bYS16QS1aMC05XFwtLl0rLyxcbiAgICAgICAgICAgIGFsaWFzOiAndmFyaWFibGUnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2xvbjogLzovXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC9bYS16QS1aMC05XFwtLl0rXFxzKjovLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAnZmllbGQtbmFtZSc6IHtcbiAgICAgICAgICAgIHBhdHRlcm46IC9bYS16QS1aMC05XFwtLl0rLyxcbiAgICAgICAgICAgIGFsaWFzOiAndmFyaWFibGUnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb2xvbjogLzovXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdLFxuICAgIHB1bmN0dWF0aW9uOiAvWzo7LCgpXS8sXG4gICAgbmFtZTogL1thLXpBLVowLTlcXC0uXSsvXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/nevod.js\n"));

/***/ })

}]);