"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_fsharp"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/fsharp.js":
/*!***********************************************!*\
  !*** ./node_modules/refractor/lang/fsharp.js ***!
  \***********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = fsharp\nfsharp.displayName = 'fsharp'\nfsharp.aliases = []\nfunction fsharp(Prism) {\n  Prism.languages.fsharp = Prism.languages.extend('clike', {\n    comment: [\n      {\n        pattern: /(^|[^\\\\])\\(\\*(?!\\))[\\s\\S]*?\\*\\)/,\n        lookbehind: true,\n        greedy: true\n      },\n      {\n        pattern: /(^|[^\\\\:])\\/\\/.*/,\n        lookbehind: true,\n        greedy: true\n      }\n    ],\n    string: {\n      pattern: /(?:\"\"\"[\\s\\S]*?\"\"\"|@\"(?:\"\"|[^\"])*\"|\"(?:\\\\[\\s\\S]|[^\\\\\"])*\")B?/,\n      greedy: true\n    },\n    'class-name': {\n      pattern:\n        /(\\b(?:exception|inherit|interface|new|of|type)\\s+|\\w\\s*:\\s*|\\s:\\??>\\s*)[.\\w]+\\b(?:\\s*(?:->|\\*)\\s*[.\\w]+\\b)*(?!\\s*[:.])/,\n      lookbehind: true,\n      inside: {\n        operator: /->|\\*/,\n        punctuation: /\\./\n      }\n    },\n    keyword:\n      /\\b(?:let|return|use|yield)(?:!\\B|\\b)|\\b(?:abstract|and|as|asr|assert|atomic|base|begin|break|checked|class|component|const|constraint|constructor|continue|default|delegate|do|done|downcast|downto|eager|elif|else|end|event|exception|extern|external|false|finally|fixed|for|fun|function|functor|global|if|in|include|inherit|inline|interface|internal|land|lazy|lor|lsl|lsr|lxor|match|member|method|mixin|mod|module|mutable|namespace|new|not|null|object|of|open|or|override|parallel|private|process|protected|public|pure|rec|sealed|select|sig|static|struct|tailcall|then|to|trait|true|try|type|upcast|val|virtual|void|volatile|when|while|with)\\b/,\n    number: [\n      /\\b0x[\\da-fA-F]+(?:LF|lf|un)?\\b/,\n      /\\b0b[01]+(?:uy|y)?\\b/,\n      /(?:\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+)(?:[fm]|e[+-]?\\d+)?\\b/i,\n      /\\b\\d+(?:[IlLsy]|UL|u[lsy]?)?\\b/\n    ],\n    operator:\n      /([<>~&^])\\1\\1|([*.:<>&])\\2|<-|->|[!=:]=|<?\\|{1,3}>?|\\??(?:<=|>=|<>|[-+*/%=<>])\\??|[!?^&]|~[+~-]|:>|:\\?>?/\n  })\n  Prism.languages.insertBefore('fsharp', 'keyword', {\n    preprocessor: {\n      pattern: /(^[\\t ]*)#.*/m,\n      lookbehind: true,\n      alias: 'property',\n      inside: {\n        directive: {\n          pattern: /(^#)\\b(?:else|endif|if|light|line|nowarn)\\b/,\n          lookbehind: true,\n          alias: 'keyword'\n        }\n      }\n    }\n  })\n  Prism.languages.insertBefore('fsharp', 'punctuation', {\n    'computation-expression': {\n      pattern: /\\b[_a-z]\\w*(?=\\s*\\{)/i,\n      alias: 'keyword'\n    }\n  })\n  Prism.languages.insertBefore('fsharp', 'string', {\n    annotation: {\n      pattern: /\\[<.+?>\\]/,\n      greedy: true,\n      inside: {\n        punctuation: /^\\[<|>\\]$/,\n        'class-name': {\n          pattern: /^\\w+$|(^|;\\s*)[A-Z]\\w*(?=\\()/,\n          lookbehind: true\n        },\n        'annotation-content': {\n          pattern: /[\\s\\S]+/,\n          inside: Prism.languages.fsharp\n        }\n      }\n    },\n    char: {\n      pattern:\n        /'(?:[^\\\\']|\\\\(?:.|\\d{3}|x[a-fA-F\\d]{2}|u[a-fA-F\\d]{4}|U[a-fA-F\\d]{8}))'B?/,\n      greedy: true\n    }\n  })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9mc2hhcnAuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0RBQW9ELElBQUk7QUFDeEQsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQSxtQ0FBbUM7QUFDbkM7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QjtBQUM5QjtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSw4QkFBOEIsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRTtBQUM3RTtBQUNBO0FBQ0EsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9mc2hhcnAuanM/Y2E2NiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBmc2hhcnBcbmZzaGFycC5kaXNwbGF5TmFtZSA9ICdmc2hhcnAnXG5mc2hhcnAuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBmc2hhcnAoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLmZzaGFycCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuICAgIGNvbW1lbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogLyhefFteXFxcXF0pXFwoXFwqKD8hXFwpKVtcXHNcXFNdKj9cXCpcXCkvLFxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgICBncmVlZHk6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC8oXnxbXlxcXFw6XSlcXC9cXC8uKi8sXG4gICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgIGdyZWVkeTogdHJ1ZVxuICAgICAgfVxuICAgIF0sXG4gICAgc3RyaW5nOiB7XG4gICAgICBwYXR0ZXJuOiAvKD86XCJcIlwiW1xcc1xcU10qP1wiXCJcInxAXCIoPzpcIlwifFteXCJdKSpcInxcIig/OlxcXFxbXFxzXFxTXXxbXlxcXFxcIl0pKlwiKUI/LyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgJ2NsYXNzLW5hbWUnOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvKFxcYig/OmV4Y2VwdGlvbnxpbmhlcml0fGludGVyZmFjZXxuZXd8b2Z8dHlwZSlcXHMrfFxcd1xccyo6XFxzKnxcXHM6XFw/Pz5cXHMqKVsuXFx3XStcXGIoPzpcXHMqKD86LT58XFwqKVxccypbLlxcd10rXFxiKSooPyFcXHMqWzouXSkvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBvcGVyYXRvcjogLy0+fFxcKi8sXG4gICAgICAgIHB1bmN0dWF0aW9uOiAvXFwuL1xuICAgICAgfVxuICAgIH0sXG4gICAga2V5d29yZDpcbiAgICAgIC9cXGIoPzpsZXR8cmV0dXJufHVzZXx5aWVsZCkoPzohXFxCfFxcYil8XFxiKD86YWJzdHJhY3R8YW5kfGFzfGFzcnxhc3NlcnR8YXRvbWljfGJhc2V8YmVnaW58YnJlYWt8Y2hlY2tlZHxjbGFzc3xjb21wb25lbnR8Y29uc3R8Y29uc3RyYWludHxjb25zdHJ1Y3Rvcnxjb250aW51ZXxkZWZhdWx0fGRlbGVnYXRlfGRvfGRvbmV8ZG93bmNhc3R8ZG93bnRvfGVhZ2VyfGVsaWZ8ZWxzZXxlbmR8ZXZlbnR8ZXhjZXB0aW9ufGV4dGVybnxleHRlcm5hbHxmYWxzZXxmaW5hbGx5fGZpeGVkfGZvcnxmdW58ZnVuY3Rpb258ZnVuY3RvcnxnbG9iYWx8aWZ8aW58aW5jbHVkZXxpbmhlcml0fGlubGluZXxpbnRlcmZhY2V8aW50ZXJuYWx8bGFuZHxsYXp5fGxvcnxsc2x8bHNyfGx4b3J8bWF0Y2h8bWVtYmVyfG1ldGhvZHxtaXhpbnxtb2R8bW9kdWxlfG11dGFibGV8bmFtZXNwYWNlfG5ld3xub3R8bnVsbHxvYmplY3R8b2Z8b3BlbnxvcnxvdmVycmlkZXxwYXJhbGxlbHxwcml2YXRlfHByb2Nlc3N8cHJvdGVjdGVkfHB1YmxpY3xwdXJlfHJlY3xzZWFsZWR8c2VsZWN0fHNpZ3xzdGF0aWN8c3RydWN0fHRhaWxjYWxsfHRoZW58dG98dHJhaXR8dHJ1ZXx0cnl8dHlwZXx1cGNhc3R8dmFsfHZpcnR1YWx8dm9pZHx2b2xhdGlsZXx3aGVufHdoaWxlfHdpdGgpXFxiLyxcbiAgICBudW1iZXI6IFtcbiAgICAgIC9cXGIweFtcXGRhLWZBLUZdKyg/OkxGfGxmfHVuKT9cXGIvLFxuICAgICAgL1xcYjBiWzAxXSsoPzp1eXx5KT9cXGIvLFxuICAgICAgLyg/OlxcYlxcZCsoPzpcXC5cXGQqKT98XFxCXFwuXFxkKykoPzpbZm1dfGVbKy1dP1xcZCspP1xcYi9pLFxuICAgICAgL1xcYlxcZCsoPzpbSWxMc3ldfFVMfHVbbHN5XT8pP1xcYi9cbiAgICBdLFxuICAgIG9wZXJhdG9yOlxuICAgICAgLyhbPD5+Jl5dKVxcMVxcMXwoWyouOjw+Jl0pXFwyfDwtfC0+fFshPTpdPXw8P1xcfHsxLDN9Pj98XFw/Pyg/Ojw9fD49fDw+fFstKyovJT08Pl0pXFw/P3xbIT9eJl18flsrfi1dfDo+fDpcXD8+Py9cbiAgfSlcbiAgUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZnNoYXJwJywgJ2tleXdvcmQnLCB7XG4gICAgcHJlcHJvY2Vzc29yOiB7XG4gICAgICBwYXR0ZXJuOiAvKF5bXFx0IF0qKSMuKi9tLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGFsaWFzOiAncHJvcGVydHknLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgIGRpcmVjdGl2ZToge1xuICAgICAgICAgIHBhdHRlcm46IC8oXiMpXFxiKD86ZWxzZXxlbmRpZnxpZnxsaWdodHxsaW5lfG5vd2FybilcXGIvLFxuICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgICAgYWxpYXM6ICdrZXl3b3JkJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxuICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdmc2hhcnAnLCAncHVuY3R1YXRpb24nLCB7XG4gICAgJ2NvbXB1dGF0aW9uLWV4cHJlc3Npb24nOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiW19hLXpdXFx3Kig/PVxccypcXHspL2ksXG4gICAgICBhbGlhczogJ2tleXdvcmQnXG4gICAgfVxuICB9KVxuICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdmc2hhcnAnLCAnc3RyaW5nJywge1xuICAgIGFubm90YXRpb246IHtcbiAgICAgIHBhdHRlcm46IC9cXFs8Lis/PlxcXS8sXG4gICAgICBncmVlZHk6IHRydWUsXG4gICAgICBpbnNpZGU6IHtcbiAgICAgICAgcHVuY3R1YXRpb246IC9eXFxbPHw+XFxdJC8sXG4gICAgICAgICdjbGFzcy1uYW1lJzoge1xuICAgICAgICAgIHBhdHRlcm46IC9eXFx3KyR8KF58O1xccyopW0EtWl1cXHcqKD89XFwoKS8sXG4gICAgICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICAnYW5ub3RhdGlvbi1jb250ZW50Jzoge1xuICAgICAgICAgIHBhdHRlcm46IC9bXFxzXFxTXSsvLFxuICAgICAgICAgIGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmZzaGFycFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjaGFyOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvJyg/OlteXFxcXCddfFxcXFwoPzoufFxcZHszfXx4W2EtZkEtRlxcZF17Mn18dVthLWZBLUZcXGRdezR9fFVbYS1mQS1GXFxkXXs4fSkpJ0I/LyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH1cbiAgfSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/fsharp.js\n"));

/***/ })

}]);