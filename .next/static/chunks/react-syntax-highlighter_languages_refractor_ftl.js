"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_ftl"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/ftl.js":
/*!********************************************!*\
  !*** ./node_modules/refractor/lang/ftl.js ***!
  \********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\nvar refractorMarkupTemplating = __webpack_require__(/*! ./markup-templating.js */ \"(app-pages-browser)/./node_modules/refractor/lang/markup-templating.js\")\nmodule.exports = ftl\nftl.displayName = 'ftl'\nftl.aliases = []\nfunction ftl(Prism) {\n  Prism.register(refractorMarkupTemplating)\n  ;(function (Prism) {\n    // https://freemarker.apache.org/docs/dgui_template_exp.html\n    // FTL expression with 4 levels of nesting supported\n    var FTL_EXPR =\n      /[^<()\"']|\\((?:<expr>)*\\)|<(?!#--)|<#--(?:[^-]|-(?!->))*-->|\"(?:[^\\\\\"]|\\\\.)*\"|'(?:[^\\\\']|\\\\.)*'/\n        .source\n    for (var i = 0; i < 2; i++) {\n      FTL_EXPR = FTL_EXPR.replace(/<expr>/g, function () {\n        return FTL_EXPR\n      })\n    }\n    FTL_EXPR = FTL_EXPR.replace(/<expr>/g, /[^\\s\\S]/.source)\n    var ftl = {\n      comment: /<#--[\\s\\S]*?-->/,\n      string: [\n        {\n          // raw string\n          pattern: /\\br(\"|')(?:(?!\\1)[^\\\\]|\\\\.)*\\1/,\n          greedy: true\n        },\n        {\n          pattern: RegExp(\n            /(\"|')(?:(?!\\1|\\$\\{)[^\\\\]|\\\\.|\\$\\{(?:(?!\\})(?:<expr>))*\\})*\\1/.source.replace(\n              /<expr>/g,\n              function () {\n                return FTL_EXPR\n              }\n            )\n          ),\n          greedy: true,\n          inside: {\n            interpolation: {\n              pattern: RegExp(\n                /((?:^|[^\\\\])(?:\\\\\\\\)*)\\$\\{(?:(?!\\})(?:<expr>))*\\}/.source.replace(\n                  /<expr>/g,\n                  function () {\n                    return FTL_EXPR\n                  }\n                )\n              ),\n              lookbehind: true,\n              inside: {\n                'interpolation-punctuation': {\n                  pattern: /^\\$\\{|\\}$/,\n                  alias: 'punctuation'\n                },\n                rest: null\n              }\n            }\n          }\n        }\n      ],\n      keyword: /\\b(?:as)\\b/,\n      boolean: /\\b(?:false|true)\\b/,\n      'builtin-function': {\n        pattern: /((?:^|[^?])\\?\\s*)\\w+/,\n        lookbehind: true,\n        alias: 'function'\n      },\n      function: /\\b\\w+(?=\\s*\\()/,\n      number: /\\b\\d+(?:\\.\\d+)?\\b/,\n      operator:\n        /\\.\\.[<*!]?|->|--|\\+\\+|&&|\\|\\||\\?{1,2}|[-+*/%!=<>]=?|\\b(?:gt|gte|lt|lte)\\b/,\n      punctuation: /[,;.:()[\\]{}]/\n    }\n    ftl.string[1].inside.interpolation.inside.rest = ftl\n    Prism.languages.ftl = {\n      'ftl-comment': {\n        // the pattern is shortened to be more efficient\n        pattern: /^<#--[\\s\\S]*/,\n        alias: 'comment'\n      },\n      'ftl-directive': {\n        pattern: /^<[\\s\\S]+>$/,\n        inside: {\n          directive: {\n            pattern: /(^<\\/?)[#@][a-z]\\w*/i,\n            lookbehind: true,\n            alias: 'keyword'\n          },\n          punctuation: /^<\\/?|\\/?>$/,\n          content: {\n            pattern: /\\s*\\S[\\s\\S]*/,\n            alias: 'ftl',\n            inside: ftl\n          }\n        }\n      },\n      'ftl-interpolation': {\n        pattern: /^\\$\\{[\\s\\S]*\\}$/,\n        inside: {\n          punctuation: /^\\$\\{|\\}$/,\n          content: {\n            pattern: /\\s*\\S[\\s\\S]*/,\n            alias: 'ftl',\n            inside: ftl\n          }\n        }\n      }\n    }\n    Prism.hooks.add('before-tokenize', function (env) {\n      // eslint-disable-next-line regexp/no-useless-lazy\n      var pattern = RegExp(\n        /<#--[\\s\\S]*?-->|<\\/?[#@][a-zA-Z](?:<expr>)*?>|\\$\\{(?:<expr>)*?\\}/.source.replace(\n          /<expr>/g,\n          function () {\n            return FTL_EXPR\n          }\n        ),\n        'gi'\n      )\n      Prism.languages['markup-templating'].buildPlaceholders(\n        env,\n        'ftl',\n        pattern\n      )\n    })\n    Prism.hooks.add('after-tokenize', function (env) {\n      Prism.languages['markup-templating'].tokenizePlaceholders(env, 'ftl')\n    })\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9mdGwuanMiLCJtYXBwaW5ncyI6IkFBQVk7QUFDWixnQ0FBZ0MsbUJBQU8sQ0FBQyxzR0FBd0I7QUFDaEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLE9BQU87QUFDM0I7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLCtCQUErQixlQUFlLFFBQVEsZUFBZTtBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJDQUEyQyxRQUFRLGVBQWU7QUFDbEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDLEdBQUc7QUFDcEM7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxJQUFJO0FBQzlDLHVCQUF1QixTQUFTO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EsdUJBQXVCLFNBQVM7QUFDaEM7QUFDQSw2QkFBNkIsR0FBRztBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELGNBQWM7QUFDekU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9mdGwuanM/YmVmNiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcbnZhciByZWZyYWN0b3JNYXJrdXBUZW1wbGF0aW5nID0gcmVxdWlyZSgnLi9tYXJrdXAtdGVtcGxhdGluZy5qcycpXG5tb2R1bGUuZXhwb3J0cyA9IGZ0bFxuZnRsLmRpc3BsYXlOYW1lID0gJ2Z0bCdcbmZ0bC5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIGZ0bChQcmlzbSkge1xuICBQcmlzbS5yZWdpc3RlcihyZWZyYWN0b3JNYXJrdXBUZW1wbGF0aW5nKVxuICA7KGZ1bmN0aW9uIChQcmlzbSkge1xuICAgIC8vIGh0dHBzOi8vZnJlZW1hcmtlci5hcGFjaGUub3JnL2RvY3MvZGd1aV90ZW1wbGF0ZV9leHAuaHRtbFxuICAgIC8vIEZUTCBleHByZXNzaW9uIHdpdGggNCBsZXZlbHMgb2YgbmVzdGluZyBzdXBwb3J0ZWRcbiAgICB2YXIgRlRMX0VYUFIgPVxuICAgICAgL1tePCgpXCInXXxcXCgoPzo8ZXhwcj4pKlxcKXw8KD8hIy0tKXw8Iy0tKD86W14tXXwtKD8hLT4pKSotLT58XCIoPzpbXlxcXFxcIl18XFxcXC4pKlwifCcoPzpbXlxcXFwnXXxcXFxcLikqJy9cbiAgICAgICAgLnNvdXJjZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XG4gICAgICBGVExfRVhQUiA9IEZUTF9FWFBSLnJlcGxhY2UoLzxleHByPi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBGVExfRVhQUlxuICAgICAgfSlcbiAgICB9XG4gICAgRlRMX0VYUFIgPSBGVExfRVhQUi5yZXBsYWNlKC88ZXhwcj4vZywgL1teXFxzXFxTXS8uc291cmNlKVxuICAgIHZhciBmdGwgPSB7XG4gICAgICBjb21tZW50OiAvPCMtLVtcXHNcXFNdKj8tLT4vLFxuICAgICAgc3RyaW5nOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAvLyByYXcgc3RyaW5nXG4gICAgICAgICAgcGF0dGVybjogL1xcYnIoXCJ8JykoPzooPyFcXDEpW15cXFxcXXxcXFxcLikqXFwxLyxcbiAgICAgICAgICBncmVlZHk6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHBhdHRlcm46IFJlZ0V4cChcbiAgICAgICAgICAgIC8oXCJ8JykoPzooPyFcXDF8XFwkXFx7KVteXFxcXF18XFxcXC58XFwkXFx7KD86KD8hXFx9KSg/OjxleHByPikpKlxcfSkqXFwxLy5zb3VyY2UucmVwbGFjZShcbiAgICAgICAgICAgICAgLzxleHByPi9nLFxuICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEZUTF9FWFBSXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIGdyZWVkeTogdHJ1ZSxcbiAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgIGludGVycG9sYXRpb246IHtcbiAgICAgICAgICAgICAgcGF0dGVybjogUmVnRXhwKFxuICAgICAgICAgICAgICAgIC8oKD86XnxbXlxcXFxdKSg/OlxcXFxcXFxcKSopXFwkXFx7KD86KD8hXFx9KSg/OjxleHByPikpKlxcfS8uc291cmNlLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAvPGV4cHI+L2csXG4gICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBGVExfRVhQUlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgICAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAgICAgJ2ludGVycG9sYXRpb24tcHVuY3R1YXRpb24nOiB7XG4gICAgICAgICAgICAgICAgICBwYXR0ZXJuOiAvXlxcJFxce3xcXH0kLyxcbiAgICAgICAgICAgICAgICAgIGFsaWFzOiAncHVuY3R1YXRpb24nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXN0OiBudWxsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBrZXl3b3JkOiAvXFxiKD86YXMpXFxiLyxcbiAgICAgIGJvb2xlYW46IC9cXGIoPzpmYWxzZXx0cnVlKVxcYi8sXG4gICAgICAnYnVpbHRpbi1mdW5jdGlvbic6IHtcbiAgICAgICAgcGF0dGVybjogLygoPzpefFteP10pXFw/XFxzKilcXHcrLyxcbiAgICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgICAgYWxpYXM6ICdmdW5jdGlvbidcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbjogL1xcYlxcdysoPz1cXHMqXFwoKS8sXG4gICAgICBudW1iZXI6IC9cXGJcXGQrKD86XFwuXFxkKyk/XFxiLyxcbiAgICAgIG9wZXJhdG9yOlxuICAgICAgICAvXFwuXFwuWzwqIV0/fC0+fC0tfFxcK1xcK3wmJnxcXHxcXHx8XFw/ezEsMn18Wy0rKi8lIT08Pl09P3xcXGIoPzpndHxndGV8bHR8bHRlKVxcYi8sXG4gICAgICBwdW5jdHVhdGlvbjogL1ssOy46KClbXFxde31dL1xuICAgIH1cbiAgICBmdGwuc3RyaW5nWzFdLmluc2lkZS5pbnRlcnBvbGF0aW9uLmluc2lkZS5yZXN0ID0gZnRsXG4gICAgUHJpc20ubGFuZ3VhZ2VzLmZ0bCA9IHtcbiAgICAgICdmdGwtY29tbWVudCc6IHtcbiAgICAgICAgLy8gdGhlIHBhdHRlcm4gaXMgc2hvcnRlbmVkIHRvIGJlIG1vcmUgZWZmaWNpZW50XG4gICAgICAgIHBhdHRlcm46IC9ePCMtLVtcXHNcXFNdKi8sXG4gICAgICAgIGFsaWFzOiAnY29tbWVudCdcbiAgICAgIH0sXG4gICAgICAnZnRsLWRpcmVjdGl2ZSc6IHtcbiAgICAgICAgcGF0dGVybjogL148W1xcc1xcU10rPiQvLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICBkaXJlY3RpdmU6IHtcbiAgICAgICAgICAgIHBhdHRlcm46IC8oXjxcXC8/KVsjQF1bYS16XVxcdyovaSxcbiAgICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgICAgICBhbGlhczogJ2tleXdvcmQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwdW5jdHVhdGlvbjogL148XFwvP3xcXC8/PiQvLFxuICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgIHBhdHRlcm46IC9cXHMqXFxTW1xcc1xcU10qLyxcbiAgICAgICAgICAgIGFsaWFzOiAnZnRsJyxcbiAgICAgICAgICAgIGluc2lkZTogZnRsXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJ2Z0bC1pbnRlcnBvbGF0aW9uJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXlxcJFxce1tcXHNcXFNdKlxcfSQvLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICBwdW5jdHVhdGlvbjogL15cXCRcXHt8XFx9JC8sXG4gICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgcGF0dGVybjogL1xccypcXFNbXFxzXFxTXSovLFxuICAgICAgICAgICAgYWxpYXM6ICdmdGwnLFxuICAgICAgICAgICAgaW5zaWRlOiBmdGxcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgUHJpc20uaG9va3MuYWRkKCdiZWZvcmUtdG9rZW5pemUnLCBmdW5jdGlvbiAoZW52KSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVnZXhwL25vLXVzZWxlc3MtbGF6eVxuICAgICAgdmFyIHBhdHRlcm4gPSBSZWdFeHAoXG4gICAgICAgIC88Iy0tW1xcc1xcU10qPy0tPnw8XFwvP1sjQF1bYS16QS1aXSg/OjxleHByPikqPz58XFwkXFx7KD86PGV4cHI+KSo/XFx9Ly5zb3VyY2UucmVwbGFjZShcbiAgICAgICAgICAvPGV4cHI+L2csXG4gICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEZUTF9FWFBSXG4gICAgICAgICAgfVxuICAgICAgICApLFxuICAgICAgICAnZ2knXG4gICAgICApXG4gICAgICBQcmlzbS5sYW5ndWFnZXNbJ21hcmt1cC10ZW1wbGF0aW5nJ10uYnVpbGRQbGFjZWhvbGRlcnMoXG4gICAgICAgIGVudixcbiAgICAgICAgJ2Z0bCcsXG4gICAgICAgIHBhdHRlcm5cbiAgICAgIClcbiAgICB9KVxuICAgIFByaXNtLmhvb2tzLmFkZCgnYWZ0ZXItdG9rZW5pemUnLCBmdW5jdGlvbiAoZW52KSB7XG4gICAgICBQcmlzbS5sYW5ndWFnZXNbJ21hcmt1cC10ZW1wbGF0aW5nJ10udG9rZW5pemVQbGFjZWhvbGRlcnMoZW52LCAnZnRsJylcbiAgICB9KVxuICB9KShQcmlzbSlcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/ftl.js\n"));

/***/ }),

/***/ "(app-pages-browser)/./node_modules/refractor/lang/markup-templating.js":
/*!**********************************************************!*\
  !*** ./node_modules/refractor/lang/markup-templating.js ***!
  \**********************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = markupTemplating\nmarkupTemplating.displayName = 'markupTemplating'\nmarkupTemplating.aliases = []\nfunction markupTemplating(Prism) {\n  ;(function (Prism) {\n    /**\n     * Returns the placeholder for the given language id and index.\n     *\n     * @param {string} language\n     * @param {string|number} index\n     * @returns {string}\n     */\n    function getPlaceholder(language, index) {\n      return '___' + language.toUpperCase() + index + '___'\n    }\n    Object.defineProperties((Prism.languages['markup-templating'] = {}), {\n      buildPlaceholders: {\n        /**\n         * Tokenize all inline templating expressions matching `placeholderPattern`.\n         *\n         * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns\n         * `true` will be replaced.\n         *\n         * @param {object} env The environment of the `before-tokenize` hook.\n         * @param {string} language The language id.\n         * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.\n         * @param {(match: string) => boolean} [replaceFilter]\n         */\n        value: function (env, language, placeholderPattern, replaceFilter) {\n          if (env.language !== language) {\n            return\n          }\n          var tokenStack = (env.tokenStack = [])\n          env.code = env.code.replace(placeholderPattern, function (match) {\n            if (typeof replaceFilter === 'function' && !replaceFilter(match)) {\n              return match\n            }\n            var i = tokenStack.length\n            var placeholder // Check for existing strings\n            while (\n              env.code.indexOf((placeholder = getPlaceholder(language, i))) !==\n              -1\n            ) {\n              ++i\n            } // Create a sparse array\n            tokenStack[i] = match\n            return placeholder\n          }) // Switch the grammar to markup\n          env.grammar = Prism.languages.markup\n        }\n      },\n      tokenizePlaceholders: {\n        /**\n         * Replace placeholders with proper tokens after tokenizing.\n         *\n         * @param {object} env The environment of the `after-tokenize` hook.\n         * @param {string} language The language id.\n         */\n        value: function (env, language) {\n          if (env.language !== language || !env.tokenStack) {\n            return\n          } // Switch the grammar back\n          env.grammar = Prism.languages[language]\n          var j = 0\n          var keys = Object.keys(env.tokenStack)\n          function walkTokens(tokens) {\n            for (var i = 0; i < tokens.length; i++) {\n              // all placeholders are replaced already\n              if (j >= keys.length) {\n                break\n              }\n              var token = tokens[i]\n              if (\n                typeof token === 'string' ||\n                (token.content && typeof token.content === 'string')\n              ) {\n                var k = keys[j]\n                var t = env.tokenStack[k]\n                var s = typeof token === 'string' ? token : token.content\n                var placeholder = getPlaceholder(language, k)\n                var index = s.indexOf(placeholder)\n                if (index > -1) {\n                  ++j\n                  var before = s.substring(0, index)\n                  var middle = new Prism.Token(\n                    language,\n                    Prism.tokenize(t, env.grammar),\n                    'language-' + language,\n                    t\n                  )\n                  var after = s.substring(index + placeholder.length)\n                  var replacement = []\n                  if (before) {\n                    replacement.push.apply(replacement, walkTokens([before]))\n                  }\n                  replacement.push(middle)\n                  if (after) {\n                    replacement.push.apply(replacement, walkTokens([after]))\n                  }\n                  if (typeof token === 'string') {\n                    tokens.splice.apply(tokens, [i, 1].concat(replacement))\n                  } else {\n                    token.content = replacement\n                  }\n                }\n              } else if (\n                token.content\n                /* && typeof token.content !== 'string' */\n              ) {\n                walkTokens(token.content)\n              }\n            }\n            return tokens\n          }\n          walkTokens(env.tokens)\n        }\n      }\n    })\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9tYXJrdXAtdGVtcGxhdGluZy5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxlQUFlLFFBQVE7QUFDdkIsZUFBZSxlQUFlO0FBQzlCLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNFQUFzRTtBQUN0RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFtQixRQUFRO0FBQzNCLG1CQUFtQixRQUFRO0FBQzNCLG1CQUFtQixRQUFRO0FBQzNCLG1CQUFtQiw0QkFBNEI7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQkFBbUIsUUFBUTtBQUMzQixtQkFBbUIsUUFBUTtBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixtQkFBbUI7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsR0FBRztBQUNIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9tYXJrdXAtdGVtcGxhdGluZy5qcz85YzMzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcmt1cFRlbXBsYXRpbmdcbm1hcmt1cFRlbXBsYXRpbmcuZGlzcGxheU5hbWUgPSAnbWFya3VwVGVtcGxhdGluZydcbm1hcmt1cFRlbXBsYXRpbmcuYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBtYXJrdXBUZW1wbGF0aW5nKFByaXNtKSB7XG4gIDsoZnVuY3Rpb24gKFByaXNtKSB7XG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcGxhY2Vob2xkZXIgZm9yIHRoZSBnaXZlbiBsYW5ndWFnZSBpZCBhbmQgaW5kZXguXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IGluZGV4XG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQbGFjZWhvbGRlcihsYW5ndWFnZSwgaW5kZXgpIHtcbiAgICAgIHJldHVybiAnX19fJyArIGxhbmd1YWdlLnRvVXBwZXJDYXNlKCkgKyBpbmRleCArICdfX18nXG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKChQcmlzbS5sYW5ndWFnZXNbJ21hcmt1cC10ZW1wbGF0aW5nJ10gPSB7fSksIHtcbiAgICAgIGJ1aWxkUGxhY2Vob2xkZXJzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUb2tlbml6ZSBhbGwgaW5saW5lIHRlbXBsYXRpbmcgZXhwcmVzc2lvbnMgbWF0Y2hpbmcgYHBsYWNlaG9sZGVyUGF0dGVybmAuXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIGByZXBsYWNlRmlsdGVyYCBpcyBwcm92aWRlZCwgb25seSBtYXRjaGVzIG9mIGBwbGFjZWhvbGRlclBhdHRlcm5gIGZvciB3aGljaCBgcmVwbGFjZUZpbHRlcmAgcmV0dXJuc1xuICAgICAgICAgKiBgdHJ1ZWAgd2lsbCBiZSByZXBsYWNlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGVudiBUaGUgZW52aXJvbm1lbnQgb2YgdGhlIGBiZWZvcmUtdG9rZW5pemVgIGhvb2suXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYW5ndWFnZSBUaGUgbGFuZ3VhZ2UgaWQuXG4gICAgICAgICAqIEBwYXJhbSB7UmVnRXhwfSBwbGFjZWhvbGRlclBhdHRlcm4gVGhlIG1hdGNoZXMgb2YgdGhpcyBwYXR0ZXJuIHdpbGwgYmUgcmVwbGFjZWQgYnkgcGxhY2Vob2xkZXJzLlxuICAgICAgICAgKiBAcGFyYW0geyhtYXRjaDogc3RyaW5nKSA9PiBib29sZWFufSBbcmVwbGFjZUZpbHRlcl1cbiAgICAgICAgICovXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAoZW52LCBsYW5ndWFnZSwgcGxhY2Vob2xkZXJQYXR0ZXJuLCByZXBsYWNlRmlsdGVyKSB7XG4gICAgICAgICAgaWYgKGVudi5sYW5ndWFnZSAhPT0gbGFuZ3VhZ2UpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgdG9rZW5TdGFjayA9IChlbnYudG9rZW5TdGFjayA9IFtdKVxuICAgICAgICAgIGVudi5jb2RlID0gZW52LmNvZGUucmVwbGFjZShwbGFjZWhvbGRlclBhdHRlcm4sIGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXBsYWNlRmlsdGVyID09PSAnZnVuY3Rpb24nICYmICFyZXBsYWNlRmlsdGVyKG1hdGNoKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpID0gdG9rZW5TdGFjay5sZW5ndGhcbiAgICAgICAgICAgIHZhciBwbGFjZWhvbGRlciAvLyBDaGVjayBmb3IgZXhpc3Rpbmcgc3RyaW5nc1xuICAgICAgICAgICAgd2hpbGUgKFxuICAgICAgICAgICAgICBlbnYuY29kZS5pbmRleE9mKChwbGFjZWhvbGRlciA9IGdldFBsYWNlaG9sZGVyKGxhbmd1YWdlLCBpKSkpICE9PVxuICAgICAgICAgICAgICAtMVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICsraVxuICAgICAgICAgICAgfSAvLyBDcmVhdGUgYSBzcGFyc2UgYXJyYXlcbiAgICAgICAgICAgIHRva2VuU3RhY2tbaV0gPSBtYXRjaFxuICAgICAgICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyXG4gICAgICAgICAgfSkgLy8gU3dpdGNoIHRoZSBncmFtbWFyIHRvIG1hcmt1cFxuICAgICAgICAgIGVudi5ncmFtbWFyID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdG9rZW5pemVQbGFjZWhvbGRlcnM6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlcGxhY2UgcGxhY2Vob2xkZXJzIHdpdGggcHJvcGVyIHRva2VucyBhZnRlciB0b2tlbml6aW5nLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gZW52IFRoZSBlbnZpcm9ubWVudCBvZiB0aGUgYGFmdGVyLXRva2VuaXplYCBob29rLlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2UgVGhlIGxhbmd1YWdlIGlkLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIChlbnYsIGxhbmd1YWdlKSB7XG4gICAgICAgICAgaWYgKGVudi5sYW5ndWFnZSAhPT0gbGFuZ3VhZ2UgfHwgIWVudi50b2tlblN0YWNrKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9IC8vIFN3aXRjaCB0aGUgZ3JhbW1hciBiYWNrXG4gICAgICAgICAgZW52LmdyYW1tYXIgPSBQcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdXG4gICAgICAgICAgdmFyIGogPSAwXG4gICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhlbnYudG9rZW5TdGFjaylcbiAgICAgICAgICBmdW5jdGlvbiB3YWxrVG9rZW5zKHRva2Vucykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgLy8gYWxsIHBsYWNlaG9sZGVycyBhcmUgcmVwbGFjZWQgYWxyZWFkeVxuICAgICAgICAgICAgICBpZiAoaiA+PSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICAgICAgKHRva2VuLmNvbnRlbnQgJiYgdHlwZW9mIHRva2VuLmNvbnRlbnQgPT09ICdzdHJpbmcnKVxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB2YXIgayA9IGtleXNbal1cbiAgICAgICAgICAgICAgICB2YXIgdCA9IGVudi50b2tlblN0YWNrW2tdXG4gICAgICAgICAgICAgICAgdmFyIHMgPSB0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnID8gdG9rZW4gOiB0b2tlbi5jb250ZW50XG4gICAgICAgICAgICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZ2V0UGxhY2Vob2xkZXIobGFuZ3VhZ2UsIGspXG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gcy5pbmRleE9mKHBsYWNlaG9sZGVyKVxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICArK2pcbiAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmUgPSBzLnN1YnN0cmluZygwLCBpbmRleClcbiAgICAgICAgICAgICAgICAgIHZhciBtaWRkbGUgPSBuZXcgUHJpc20uVG9rZW4oXG4gICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlLFxuICAgICAgICAgICAgICAgICAgICBQcmlzbS50b2tlbml6ZSh0LCBlbnYuZ3JhbW1hciksXG4gICAgICAgICAgICAgICAgICAgICdsYW5ndWFnZS0nICsgbGFuZ3VhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHRcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgIHZhciBhZnRlciA9IHMuc3Vic3RyaW5nKGluZGV4ICsgcGxhY2Vob2xkZXIubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gW11cbiAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQucHVzaC5hcHBseShyZXBsYWNlbWVudCwgd2Fsa1Rva2VucyhbYmVmb3JlXSkpXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5wdXNoKG1pZGRsZSlcbiAgICAgICAgICAgICAgICAgIGlmIChhZnRlcikge1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5wdXNoLmFwcGx5KHJlcGxhY2VtZW50LCB3YWxrVG9rZW5zKFthZnRlcl0pKVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnNwbGljZS5hcHBseSh0b2tlbnMsIFtpLCAxXS5jb25jYXQocmVwbGFjZW1lbnQpKVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4uY29udGVudCA9IHJlcGxhY2VtZW50XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgIHRva2VuLmNvbnRlbnRcbiAgICAgICAgICAgICAgICAvKiAmJiB0eXBlb2YgdG9rZW4uY29udGVudCAhPT0gJ3N0cmluZycgKi9cbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgd2Fsa1Rva2Vucyh0b2tlbi5jb250ZW50KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdG9rZW5zXG4gICAgICAgICAgfVxuICAgICAgICAgIHdhbGtUb2tlbnMoZW52LnRva2VucylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0pKFByaXNtKVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/markup-templating.js\n"));

/***/ })

}]);