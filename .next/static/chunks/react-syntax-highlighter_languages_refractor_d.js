"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_d"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/d.js":
/*!******************************************!*\
  !*** ./node_modules/refractor/lang/d.js ***!
  \******************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = d\nd.displayName = 'd'\nd.aliases = []\nfunction d(Prism) {\n  Prism.languages.d = Prism.languages.extend('clike', {\n    comment: [\n      {\n        // Shebang\n        pattern: /^\\s*#!.+/,\n        greedy: true\n      },\n      {\n        pattern: RegExp(\n          /(^|[^\\\\])/.source +\n            '(?:' +\n            [\n              // /+ comment +/\n              // Allow one level of nesting\n              /\\/\\+(?:\\/\\+(?:[^+]|\\+(?!\\/))*\\+\\/|(?!\\/\\+)[\\s\\S])*?\\+\\//.source, // // comment\n              /\\/\\/.*/.source, // /* comment */\n              /\\/\\*[\\s\\S]*?\\*\\//.source\n            ].join('|') +\n            ')'\n        ),\n        lookbehind: true,\n        greedy: true\n      }\n    ],\n    string: [\n      {\n        pattern: RegExp(\n          [\n            // r\"\", x\"\"\n            /\\b[rx]\"(?:\\\\[\\s\\S]|[^\\\\\"])*\"[cwd]?/.source, // q\"[]\", q\"()\", q\"<>\", q\"{}\"\n            /\\bq\"(?:\\[[\\s\\S]*?\\]|\\([\\s\\S]*?\\)|<[\\s\\S]*?>|\\{[\\s\\S]*?\\})\"/.source, // q\"IDENT\n            // ...\n            // IDENT\"\n            /\\bq\"((?!\\d)\\w+)$[\\s\\S]*?^\\1\"/.source, // q\"//\", q\"||\", etc.\n            // eslint-disable-next-line regexp/strict\n            /\\bq\"(.)[\\s\\S]*?\\2\"/.source, // eslint-disable-next-line regexp/strict\n            /([\"`])(?:\\\\[\\s\\S]|(?!\\3)[^\\\\])*\\3[cwd]?/.source\n          ].join('|'),\n          'm'\n        ),\n        greedy: true\n      },\n      {\n        pattern: /\\bq\\{(?:\\{[^{}]*\\}|[^{}])*\\}/,\n        greedy: true,\n        alias: 'token-string'\n      }\n    ],\n    // In order: $, keywords and special tokens, globally defined symbols\n    keyword:\n      /\\$|\\b(?:__(?:(?:DATE|EOF|FILE|FUNCTION|LINE|MODULE|PRETTY_FUNCTION|TIMESTAMP|TIME|VENDOR|VERSION)__|gshared|parameters|traits|vector)|abstract|alias|align|asm|assert|auto|body|bool|break|byte|case|cast|catch|cdouble|cent|cfloat|char|class|const|continue|creal|dchar|debug|default|delegate|delete|deprecated|do|double|dstring|else|enum|export|extern|false|final|finally|float|for|foreach|foreach_reverse|function|goto|idouble|if|ifloat|immutable|import|inout|int|interface|invariant|ireal|lazy|long|macro|mixin|module|new|nothrow|null|out|override|package|pragma|private|protected|ptrdiff_t|public|pure|real|ref|return|scope|shared|short|size_t|static|string|struct|super|switch|synchronized|template|this|throw|true|try|typedef|typeid|typeof|ubyte|ucent|uint|ulong|union|unittest|ushort|version|void|volatile|wchar|while|with|wstring)\\b/,\n    number: [\n      // The lookbehind and the negative look-ahead try to prevent bad highlighting of the .. operator\n      // Hexadecimal numbers must be handled separately to avoid problems with exponent \"e\"\n      /\\b0x\\.?[a-f\\d_]+(?:(?!\\.\\.)\\.[a-f\\d_]*)?(?:p[+-]?[a-f\\d_]+)?[ulfi]{0,4}/i,\n      {\n        pattern:\n          /((?:\\.\\.)?)(?:\\b0b\\.?|\\b|\\.)\\d[\\d_]*(?:(?!\\.\\.)\\.[\\d_]*)?(?:e[+-]?\\d[\\d_]*)?[ulfi]{0,4}/i,\n        lookbehind: true\n      }\n    ],\n    operator:\n      /\\|[|=]?|&[&=]?|\\+[+=]?|-[-=]?|\\.?\\.\\.|=[>=]?|!(?:i[ns]\\b|<>?=?|>=?|=)?|\\bi[ns]\\b|(?:<[<>]?|>>?>?|\\^\\^|[*\\/%^~])=?/\n  })\n  Prism.languages.insertBefore('d', 'string', {\n    // Characters\n    // 'a', '\\\\', '\\n', '\\xFF', '\\377', '\\uFFFF', '\\U0010FFFF', '\\quot'\n    char: /'(?:\\\\(?:\\W|\\w+)|[^\\\\])'/\n  })\n  Prism.languages.insertBefore('d', 'keyword', {\n    property: /\\B@\\w*/\n  })\n  Prism.languages.insertBefore('d', 'function', {\n    register: {\n      // Iasm registers\n      pattern:\n        /\\b(?:[ABCD][LHX]|E?(?:BP|DI|SI|SP)|[BS]PL|[ECSDGF]S|CR[0234]|[DS]IL|DR[012367]|E[ABCD]X|X?MM[0-7]|R(?:1[0-5]|[89])[BWD]?|R[ABCD]X|R[BS]P|R[DS]I|TR[3-7]|XMM(?:1[0-5]|[89])|YMM(?:1[0-5]|\\d))\\b|\\bST(?:\\([0-7]\\)|\\b)/,\n      alias: 'variable'\n    }\n  })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9kLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUZBQXFGO0FBQ3JGLDJEQUEyRCxVQUFVO0FBQ3JFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsdUJBQXVCLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSztBQUM5QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBFQUEwRSxJQUFJO0FBQzlFO0FBQ0E7QUFDQSw4RkFBOEYsSUFBSTtBQUNsRztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0giLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2QuanM/NDg1NyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBkXG5kLmRpc3BsYXlOYW1lID0gJ2QnXG5kLmFsaWFzZXMgPSBbXVxuZnVuY3Rpb24gZChQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMuZCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuICAgIGNvbW1lbnQ6IFtcbiAgICAgIHtcbiAgICAgICAgLy8gU2hlYmFuZ1xuICAgICAgICBwYXR0ZXJuOiAvXlxccyojIS4rLyxcbiAgICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBwYXR0ZXJuOiBSZWdFeHAoXG4gICAgICAgICAgLyhefFteXFxcXF0pLy5zb3VyY2UgK1xuICAgICAgICAgICAgJyg/OicgK1xuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAvLyAvKyBjb21tZW50ICsvXG4gICAgICAgICAgICAgIC8vIEFsbG93IG9uZSBsZXZlbCBvZiBuZXN0aW5nXG4gICAgICAgICAgICAgIC9cXC9cXCsoPzpcXC9cXCsoPzpbXitdfFxcKyg/IVxcLykpKlxcK1xcL3woPyFcXC9cXCspW1xcc1xcU10pKj9cXCtcXC8vLnNvdXJjZSwgLy8gLy8gY29tbWVudFxuICAgICAgICAgICAgICAvXFwvXFwvLiovLnNvdXJjZSwgLy8gLyogY29tbWVudCAqL1xuICAgICAgICAgICAgICAvXFwvXFwqW1xcc1xcU10qP1xcKlxcLy8uc291cmNlXG4gICAgICAgICAgICBdLmpvaW4oJ3wnKSArXG4gICAgICAgICAgICAnKSdcbiAgICAgICAgKSxcbiAgICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgICAgZ3JlZWR5OiB0cnVlXG4gICAgICB9XG4gICAgXSxcbiAgICBzdHJpbmc6IFtcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogUmVnRXhwKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIC8vIHJcIlwiLCB4XCJcIlxuICAgICAgICAgICAgL1xcYltyeF1cIig/OlxcXFxbXFxzXFxTXXxbXlxcXFxcIl0pKlwiW2N3ZF0/Ly5zb3VyY2UsIC8vIHFcIltdXCIsIHFcIigpXCIsIHFcIjw+XCIsIHFcInt9XCJcbiAgICAgICAgICAgIC9cXGJxXCIoPzpcXFtbXFxzXFxTXSo/XFxdfFxcKFtcXHNcXFNdKj9cXCl8PFtcXHNcXFNdKj8+fFxce1tcXHNcXFNdKj9cXH0pXCIvLnNvdXJjZSwgLy8gcVwiSURFTlRcbiAgICAgICAgICAgIC8vIC4uLlxuICAgICAgICAgICAgLy8gSURFTlRcIlxuICAgICAgICAgICAgL1xcYnFcIigoPyFcXGQpXFx3KykkW1xcc1xcU10qP15cXDFcIi8uc291cmNlLCAvLyBxXCIvL1wiLCBxXCJ8fFwiLCBldGMuXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVnZXhwL3N0cmljdFxuICAgICAgICAgICAgL1xcYnFcIiguKVtcXHNcXFNdKj9cXDJcIi8uc291cmNlLCAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVnZXhwL3N0cmljdFxuICAgICAgICAgICAgLyhbXCJgXSkoPzpcXFxcW1xcc1xcU118KD8hXFwzKVteXFxcXF0pKlxcM1tjd2RdPy8uc291cmNlXG4gICAgICAgICAgXS5qb2luKCd8JyksXG4gICAgICAgICAgJ20nXG4gICAgICAgICksXG4gICAgICAgIGdyZWVkeTogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcYnFcXHsoPzpcXHtbXnt9XSpcXH18W157fV0pKlxcfS8sXG4gICAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgICAgYWxpYXM6ICd0b2tlbi1zdHJpbmcnXG4gICAgICB9XG4gICAgXSxcbiAgICAvLyBJbiBvcmRlcjogJCwga2V5d29yZHMgYW5kIHNwZWNpYWwgdG9rZW5zLCBnbG9iYWxseSBkZWZpbmVkIHN5bWJvbHNcbiAgICBrZXl3b3JkOlxuICAgICAgL1xcJHxcXGIoPzpfXyg/Oig/OkRBVEV8RU9GfEZJTEV8RlVOQ1RJT058TElORXxNT0RVTEV8UFJFVFRZX0ZVTkNUSU9OfFRJTUVTVEFNUHxUSU1FfFZFTkRPUnxWRVJTSU9OKV9ffGdzaGFyZWR8cGFyYW1ldGVyc3x0cmFpdHN8dmVjdG9yKXxhYnN0cmFjdHxhbGlhc3xhbGlnbnxhc218YXNzZXJ0fGF1dG98Ym9keXxib29sfGJyZWFrfGJ5dGV8Y2FzZXxjYXN0fGNhdGNofGNkb3VibGV8Y2VudHxjZmxvYXR8Y2hhcnxjbGFzc3xjb25zdHxjb250aW51ZXxjcmVhbHxkY2hhcnxkZWJ1Z3xkZWZhdWx0fGRlbGVnYXRlfGRlbGV0ZXxkZXByZWNhdGVkfGRvfGRvdWJsZXxkc3RyaW5nfGVsc2V8ZW51bXxleHBvcnR8ZXh0ZXJufGZhbHNlfGZpbmFsfGZpbmFsbHl8ZmxvYXR8Zm9yfGZvcmVhY2h8Zm9yZWFjaF9yZXZlcnNlfGZ1bmN0aW9ufGdvdG98aWRvdWJsZXxpZnxpZmxvYXR8aW1tdXRhYmxlfGltcG9ydHxpbm91dHxpbnR8aW50ZXJmYWNlfGludmFyaWFudHxpcmVhbHxsYXp5fGxvbmd8bWFjcm98bWl4aW58bW9kdWxlfG5ld3xub3Rocm93fG51bGx8b3V0fG92ZXJyaWRlfHBhY2thZ2V8cHJhZ21hfHByaXZhdGV8cHJvdGVjdGVkfHB0cmRpZmZfdHxwdWJsaWN8cHVyZXxyZWFsfHJlZnxyZXR1cm58c2NvcGV8c2hhcmVkfHNob3J0fHNpemVfdHxzdGF0aWN8c3RyaW5nfHN0cnVjdHxzdXBlcnxzd2l0Y2h8c3luY2hyb25pemVkfHRlbXBsYXRlfHRoaXN8dGhyb3d8dHJ1ZXx0cnl8dHlwZWRlZnx0eXBlaWR8dHlwZW9mfHVieXRlfHVjZW50fHVpbnR8dWxvbmd8dW5pb258dW5pdHRlc3R8dXNob3J0fHZlcnNpb258dm9pZHx2b2xhdGlsZXx3Y2hhcnx3aGlsZXx3aXRofHdzdHJpbmcpXFxiLyxcbiAgICBudW1iZXI6IFtcbiAgICAgIC8vIFRoZSBsb29rYmVoaW5kIGFuZCB0aGUgbmVnYXRpdmUgbG9vay1haGVhZCB0cnkgdG8gcHJldmVudCBiYWQgaGlnaGxpZ2h0aW5nIG9mIHRoZSAuLiBvcGVyYXRvclxuICAgICAgLy8gSGV4YWRlY2ltYWwgbnVtYmVycyBtdXN0IGJlIGhhbmRsZWQgc2VwYXJhdGVseSB0byBhdm9pZCBwcm9ibGVtcyB3aXRoIGV4cG9uZW50IFwiZVwiXG4gICAgICAvXFxiMHhcXC4/W2EtZlxcZF9dKyg/Oig/IVxcLlxcLilcXC5bYS1mXFxkX10qKT8oPzpwWystXT9bYS1mXFxkX10rKT9bdWxmaV17MCw0fS9pLFxuICAgICAge1xuICAgICAgICBwYXR0ZXJuOlxuICAgICAgICAgIC8oKD86XFwuXFwuKT8pKD86XFxiMGJcXC4/fFxcYnxcXC4pXFxkW1xcZF9dKig/Oig/IVxcLlxcLilcXC5bXFxkX10qKT8oPzplWystXT9cXGRbXFxkX10qKT9bdWxmaV17MCw0fS9pLFxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgICB9XG4gICAgXSxcbiAgICBvcGVyYXRvcjpcbiAgICAgIC9cXHxbfD1dP3wmWyY9XT98XFwrWys9XT98LVstPV0/fFxcLj9cXC5cXC58PVs+PV0/fCEoPzppW25zXVxcYnw8Pj89P3w+PT98PSk/fFxcYmlbbnNdXFxifCg/OjxbPD5dP3w+Pj8+P3xcXF5cXF58WypcXC8lXn5dKT0/L1xuICB9KVxuICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdkJywgJ3N0cmluZycsIHtcbiAgICAvLyBDaGFyYWN0ZXJzXG4gICAgLy8gJ2EnLCAnXFxcXCcsICdcXG4nLCAnXFx4RkYnLCAnXFwzNzcnLCAnXFx1RkZGRicsICdcXFUwMDEwRkZGRicsICdcXHF1b3QnXG4gICAgY2hhcjogLycoPzpcXFxcKD86XFxXfFxcdyspfFteXFxcXF0pJy9cbiAgfSlcbiAgUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZCcsICdrZXl3b3JkJywge1xuICAgIHByb3BlcnR5OiAvXFxCQFxcdyovXG4gIH0pXG4gIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2QnLCAnZnVuY3Rpb24nLCB7XG4gICAgcmVnaXN0ZXI6IHtcbiAgICAgIC8vIElhc20gcmVnaXN0ZXJzXG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvXFxiKD86W0FCQ0RdW0xIWF18RT8oPzpCUHxESXxTSXxTUCl8W0JTXVBMfFtFQ1NER0ZdU3xDUlswMjM0XXxbRFNdSUx8RFJbMDEyMzY3XXxFW0FCQ0RdWHxYP01NWzAtN118Uig/OjFbMC01XXxbODldKVtCV0RdP3xSW0FCQ0RdWHxSW0JTXVB8UltEU11JfFRSWzMtN118WE1NKD86MVswLTVdfFs4OV0pfFlNTSg/OjFbMC01XXxcXGQpKVxcYnxcXGJTVCg/OlxcKFswLTddXFwpfFxcYikvLFxuICAgICAgYWxpYXM6ICd2YXJpYWJsZSdcbiAgICB9XG4gIH0pXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/d.js\n"));

/***/ })

}]);