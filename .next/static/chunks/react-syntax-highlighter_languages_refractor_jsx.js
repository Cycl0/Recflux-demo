"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_jsx"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/jsx.js":
/*!********************************************!*\
  !*** ./node_modules/refractor/lang/jsx.js ***!
  \********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = jsx\njsx.displayName = 'jsx'\njsx.aliases = []\nfunction jsx(Prism) {\n  ;(function (Prism) {\n    var javascript = Prism.util.clone(Prism.languages.javascript)\n    var space = /(?:\\s|\\/\\/.*(?!.)|\\/\\*(?:[^*]|\\*(?!\\/))\\*\\/)/.source\n    var braces = /(?:\\{(?:\\{(?:\\{[^{}]*\\}|[^{}])*\\}|[^{}])*\\})/.source\n    var spread = /(?:\\{<S>*\\.{3}(?:[^{}]|<BRACES>)*\\})/.source\n    /**\n     * @param {string} source\n     * @param {string} [flags]\n     */\n    function re(source, flags) {\n      source = source\n        .replace(/<S>/g, function () {\n          return space\n        })\n        .replace(/<BRACES>/g, function () {\n          return braces\n        })\n        .replace(/<SPREAD>/g, function () {\n          return spread\n        })\n      return RegExp(source, flags)\n    }\n    spread = re(spread).source\n    Prism.languages.jsx = Prism.languages.extend('markup', javascript)\n    Prism.languages.jsx.tag.pattern = re(\n      /<\\/?(?:[\\w.:-]+(?:<S>+(?:[\\w.:$-]+(?:=(?:\"(?:\\\\[\\s\\S]|[^\\\\\"])*\"|'(?:\\\\[\\s\\S]|[^\\\\'])*'|[^\\s{'\"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\\/?)?>/\n        .source\n    )\n    Prism.languages.jsx.tag.inside['tag'].pattern = /^<\\/?[^\\s>\\/]*/\n    Prism.languages.jsx.tag.inside['attr-value'].pattern =\n      /=(?!\\{)(?:\"(?:\\\\[\\s\\S]|[^\\\\\"])*\"|'(?:\\\\[\\s\\S]|[^\\\\'])*'|[^\\s'\">]+)/\n    Prism.languages.jsx.tag.inside['tag'].inside['class-name'] =\n      /^[A-Z]\\w*(?:\\.[A-Z]\\w*)*$/\n    Prism.languages.jsx.tag.inside['comment'] = javascript['comment']\n    Prism.languages.insertBefore(\n      'inside',\n      'attr-name',\n      {\n        spread: {\n          pattern: re(/<SPREAD>/.source),\n          inside: Prism.languages.jsx\n        }\n      },\n      Prism.languages.jsx.tag\n    )\n    Prism.languages.insertBefore(\n      'inside',\n      'special-attr',\n      {\n        script: {\n          // Allow for two levels of nesting\n          pattern: re(/=<BRACES>/.source),\n          alias: 'language-javascript',\n          inside: {\n            'script-punctuation': {\n              pattern: /^=(?=\\{)/,\n              alias: 'punctuation'\n            },\n            rest: Prism.languages.jsx\n          }\n        }\n      },\n      Prism.languages.jsx.tag\n    ) // The following will handle plain text inside tags\n    var stringifyToken = function (token) {\n      if (!token) {\n        return ''\n      }\n      if (typeof token === 'string') {\n        return token\n      }\n      if (typeof token.content === 'string') {\n        return token.content\n      }\n      return token.content.map(stringifyToken).join('')\n    }\n    var walkTokens = function (tokens) {\n      var openedTags = []\n      for (var i = 0; i < tokens.length; i++) {\n        var token = tokens[i]\n        var notTagNorBrace = false\n        if (typeof token !== 'string') {\n          if (\n            token.type === 'tag' &&\n            token.content[0] &&\n            token.content[0].type === 'tag'\n          ) {\n            // We found a tag, now find its kind\n            if (token.content[0].content[0].content === '</') {\n              // Closing tag\n              if (\n                openedTags.length > 0 &&\n                openedTags[openedTags.length - 1].tagName ===\n                  stringifyToken(token.content[0].content[1])\n              ) {\n                // Pop matching opening tag\n                openedTags.pop()\n              }\n            } else {\n              if (token.content[token.content.length - 1].content === '/>') {\n                // Autoclosed tag, ignore\n              } else {\n                // Opening tag\n                openedTags.push({\n                  tagName: stringifyToken(token.content[0].content[1]),\n                  openedBraces: 0\n                })\n              }\n            }\n          } else if (\n            openedTags.length > 0 &&\n            token.type === 'punctuation' &&\n            token.content === '{'\n          ) {\n            // Here we might have entered a JSX context inside a tag\n            openedTags[openedTags.length - 1].openedBraces++\n          } else if (\n            openedTags.length > 0 &&\n            openedTags[openedTags.length - 1].openedBraces > 0 &&\n            token.type === 'punctuation' &&\n            token.content === '}'\n          ) {\n            // Here we might have left a JSX context inside a tag\n            openedTags[openedTags.length - 1].openedBraces--\n          } else {\n            notTagNorBrace = true\n          }\n        }\n        if (notTagNorBrace || typeof token === 'string') {\n          if (\n            openedTags.length > 0 &&\n            openedTags[openedTags.length - 1].openedBraces === 0\n          ) {\n            // Here we are inside a tag, and not inside a JSX context.\n            // That's plain text: drop any tokens matched.\n            var plainText = stringifyToken(token) // And merge text with adjacent text\n            if (\n              i < tokens.length - 1 &&\n              (typeof tokens[i + 1] === 'string' ||\n                tokens[i + 1].type === 'plain-text')\n            ) {\n              plainText += stringifyToken(tokens[i + 1])\n              tokens.splice(i + 1, 1)\n            }\n            if (\n              i > 0 &&\n              (typeof tokens[i - 1] === 'string' ||\n                tokens[i - 1].type === 'plain-text')\n            ) {\n              plainText = stringifyToken(tokens[i - 1]) + plainText\n              tokens.splice(i - 1, 1)\n              i--\n            }\n            tokens[i] = new Prism.Token(\n              'plain-text',\n              plainText,\n              null,\n              plainText\n            )\n          }\n        }\n        if (token.content && typeof token.content !== 'string') {\n          walkTokens(token.content)\n        }\n      }\n    }\n    Prism.hooks.add('after-tokenize', function (env) {\n      if (env.language !== 'jsx' && env.language !== 'tsx') {\n        return\n      }\n      walkTokens(env.tokens)\n    })\n  })(Prism)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9qc3guanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLHVCQUF1QixLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQUs7QUFDN0QsdUJBQXVCLE9BQU8sRUFBRSxPQUFPLGNBQWM7QUFDckQ7QUFDQSxlQUFlLFFBQVE7QUFDdkIsZUFBZSxRQUFRO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtR0FBbUc7QUFDbkc7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0I7QUFDL0I7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCLG1CQUFtQjtBQUN6QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQSxZQUFZO0FBQ1o7QUFDQTtBQUNBLGdDQUFnQztBQUNoQztBQUNBO0FBQ0E7QUFDQSxZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxHQUFHO0FBQ0giLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2pzeC5qcz9mYzYyIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGpzeFxuanN4LmRpc3BsYXlOYW1lID0gJ2pzeCdcbmpzeC5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIGpzeChQcmlzbSkge1xuICA7KGZ1bmN0aW9uIChQcmlzbSkge1xuICAgIHZhciBqYXZhc2NyaXB0ID0gUHJpc20udXRpbC5jbG9uZShQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdClcbiAgICB2YXIgc3BhY2UgPSAvKD86XFxzfFxcL1xcLy4qKD8hLil8XFwvXFwqKD86W14qXXxcXCooPyFcXC8pKVxcKlxcLykvLnNvdXJjZVxuICAgIHZhciBicmFjZXMgPSAvKD86XFx7KD86XFx7KD86XFx7W157fV0qXFx9fFtee31dKSpcXH18W157fV0pKlxcfSkvLnNvdXJjZVxuICAgIHZhciBzcHJlYWQgPSAvKD86XFx7PFM+KlxcLnszfSg/Oltee31dfDxCUkFDRVM+KSpcXH0pLy5zb3VyY2VcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtmbGFnc11cbiAgICAgKi9cbiAgICBmdW5jdGlvbiByZShzb3VyY2UsIGZsYWdzKSB7XG4gICAgICBzb3VyY2UgPSBzb3VyY2VcbiAgICAgICAgLnJlcGxhY2UoLzxTPi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHNwYWNlXG4gICAgICAgIH0pXG4gICAgICAgIC5yZXBsYWNlKC88QlJBQ0VTPi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGJyYWNlc1xuICAgICAgICB9KVxuICAgICAgICAucmVwbGFjZSgvPFNQUkVBRD4vZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBzcHJlYWRcbiAgICAgICAgfSlcbiAgICAgIHJldHVybiBSZWdFeHAoc291cmNlLCBmbGFncylcbiAgICB9XG4gICAgc3ByZWFkID0gcmUoc3ByZWFkKS5zb3VyY2VcbiAgICBQcmlzbS5sYW5ndWFnZXMuanN4ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnbWFya3VwJywgamF2YXNjcmlwdClcbiAgICBQcmlzbS5sYW5ndWFnZXMuanN4LnRhZy5wYXR0ZXJuID0gcmUoXG4gICAgICAvPFxcLz8oPzpbXFx3LjotXSsoPzo8Uz4rKD86W1xcdy46JC1dKyg/Oj0oPzpcIig/OlxcXFxbXFxzXFxTXXxbXlxcXFxcIl0pKlwifCcoPzpcXFxcW1xcc1xcU118W15cXFxcJ10pKid8W15cXHN7J1wiLz49XSt8PEJSQUNFUz4pKT98PFNQUkVBRD4pKSo8Uz4qXFwvPyk/Pi9cbiAgICAgICAgLnNvdXJjZVxuICAgIClcbiAgICBQcmlzbS5sYW5ndWFnZXMuanN4LnRhZy5pbnNpZGVbJ3RhZyddLnBhdHRlcm4gPSAvXjxcXC8/W15cXHM+XFwvXSovXG4gICAgUHJpc20ubGFuZ3VhZ2VzLmpzeC50YWcuaW5zaWRlWydhdHRyLXZhbHVlJ10ucGF0dGVybiA9XG4gICAgICAvPSg/IVxceykoPzpcIig/OlxcXFxbXFxzXFxTXXxbXlxcXFxcIl0pKlwifCcoPzpcXFxcW1xcc1xcU118W15cXFxcJ10pKid8W15cXHMnXCI+XSspL1xuICAgIFByaXNtLmxhbmd1YWdlcy5qc3gudGFnLmluc2lkZVsndGFnJ10uaW5zaWRlWydjbGFzcy1uYW1lJ10gPVxuICAgICAgL15bQS1aXVxcdyooPzpcXC5bQS1aXVxcdyopKiQvXG4gICAgUHJpc20ubGFuZ3VhZ2VzLmpzeC50YWcuaW5zaWRlWydjb21tZW50J10gPSBqYXZhc2NyaXB0Wydjb21tZW50J11cbiAgICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKFxuICAgICAgJ2luc2lkZScsXG4gICAgICAnYXR0ci1uYW1lJyxcbiAgICAgIHtcbiAgICAgICAgc3ByZWFkOiB7XG4gICAgICAgICAgcGF0dGVybjogcmUoLzxTUFJFQUQ+Ly5zb3VyY2UpLFxuICAgICAgICAgIGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmpzeFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgUHJpc20ubGFuZ3VhZ2VzLmpzeC50YWdcbiAgICApXG4gICAgUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZShcbiAgICAgICdpbnNpZGUnLFxuICAgICAgJ3NwZWNpYWwtYXR0cicsXG4gICAgICB7XG4gICAgICAgIHNjcmlwdDoge1xuICAgICAgICAgIC8vIEFsbG93IGZvciB0d28gbGV2ZWxzIG9mIG5lc3RpbmdcbiAgICAgICAgICBwYXR0ZXJuOiByZSgvPTxCUkFDRVM+Ly5zb3VyY2UpLFxuICAgICAgICAgIGFsaWFzOiAnbGFuZ3VhZ2UtamF2YXNjcmlwdCcsXG4gICAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAnc2NyaXB0LXB1bmN0dWF0aW9uJzoge1xuICAgICAgICAgICAgICBwYXR0ZXJuOiAvXj0oPz1cXHspLyxcbiAgICAgICAgICAgICAgYWxpYXM6ICdwdW5jdHVhdGlvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXN0OiBQcmlzbS5sYW5ndWFnZXMuanN4XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgUHJpc20ubGFuZ3VhZ2VzLmpzeC50YWdcbiAgICApIC8vIFRoZSBmb2xsb3dpbmcgd2lsbCBoYW5kbGUgcGxhaW4gdGV4dCBpbnNpZGUgdGFnc1xuICAgIHZhciBzdHJpbmdpZnlUb2tlbiA9IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgaWYgKCF0b2tlbikge1xuICAgICAgICByZXR1cm4gJydcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB0b2tlblxuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0b2tlbi5jb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdG9rZW4uY29udGVudFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRva2VuLmNvbnRlbnQubWFwKHN0cmluZ2lmeVRva2VuKS5qb2luKCcnKVxuICAgIH1cbiAgICB2YXIgd2Fsa1Rva2VucyA9IGZ1bmN0aW9uICh0b2tlbnMpIHtcbiAgICAgIHZhciBvcGVuZWRUYWdzID0gW11cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IHRva2Vuc1tpXVxuICAgICAgICB2YXIgbm90VGFnTm9yQnJhY2UgPSBmYWxzZVxuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09ICd0YWcnICYmXG4gICAgICAgICAgICB0b2tlbi5jb250ZW50WzBdICYmXG4gICAgICAgICAgICB0b2tlbi5jb250ZW50WzBdLnR5cGUgPT09ICd0YWcnXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBXZSBmb3VuZCBhIHRhZywgbm93IGZpbmQgaXRzIGtpbmRcbiAgICAgICAgICAgIGlmICh0b2tlbi5jb250ZW50WzBdLmNvbnRlbnRbMF0uY29udGVudCA9PT0gJzwvJykge1xuICAgICAgICAgICAgICAvLyBDbG9zaW5nIHRhZ1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgb3BlbmVkVGFncy5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgb3BlbmVkVGFnc1tvcGVuZWRUYWdzLmxlbmd0aCAtIDFdLnRhZ05hbWUgPT09XG4gICAgICAgICAgICAgICAgICBzdHJpbmdpZnlUb2tlbih0b2tlbi5jb250ZW50WzBdLmNvbnRlbnRbMV0pXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIC8vIFBvcCBtYXRjaGluZyBvcGVuaW5nIHRhZ1xuICAgICAgICAgICAgICAgIG9wZW5lZFRhZ3MucG9wKClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKHRva2VuLmNvbnRlbnRbdG9rZW4uY29udGVudC5sZW5ndGggLSAxXS5jb250ZW50ID09PSAnLz4nKSB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b2Nsb3NlZCB0YWcsIGlnbm9yZVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9wZW5pbmcgdGFnXG4gICAgICAgICAgICAgICAgb3BlbmVkVGFncy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIHRhZ05hbWU6IHN0cmluZ2lmeVRva2VuKHRva2VuLmNvbnRlbnRbMF0uY29udGVudFsxXSksXG4gICAgICAgICAgICAgICAgICBvcGVuZWRCcmFjZXM6IDBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIG9wZW5lZFRhZ3MubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gJ3B1bmN0dWF0aW9uJyAmJlxuICAgICAgICAgICAgdG9rZW4uY29udGVudCA9PT0gJ3snXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBIZXJlIHdlIG1pZ2h0IGhhdmUgZW50ZXJlZCBhIEpTWCBjb250ZXh0IGluc2lkZSBhIHRhZ1xuICAgICAgICAgICAgb3BlbmVkVGFnc1tvcGVuZWRUYWdzLmxlbmd0aCAtIDFdLm9wZW5lZEJyYWNlcysrXG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIG9wZW5lZFRhZ3MubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgb3BlbmVkVGFnc1tvcGVuZWRUYWdzLmxlbmd0aCAtIDFdLm9wZW5lZEJyYWNlcyA+IDAgJiZcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09ICdwdW5jdHVhdGlvbicgJiZcbiAgICAgICAgICAgIHRva2VuLmNvbnRlbnQgPT09ICd9J1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gSGVyZSB3ZSBtaWdodCBoYXZlIGxlZnQgYSBKU1ggY29udGV4dCBpbnNpZGUgYSB0YWdcbiAgICAgICAgICAgIG9wZW5lZFRhZ3Nbb3BlbmVkVGFncy5sZW5ndGggLSAxXS5vcGVuZWRCcmFjZXMtLVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub3RUYWdOb3JCcmFjZSA9IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vdFRhZ05vckJyYWNlIHx8IHR5cGVvZiB0b2tlbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBvcGVuZWRUYWdzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgIG9wZW5lZFRhZ3Nbb3BlbmVkVGFncy5sZW5ndGggLSAxXS5vcGVuZWRCcmFjZXMgPT09IDBcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIEhlcmUgd2UgYXJlIGluc2lkZSBhIHRhZywgYW5kIG5vdCBpbnNpZGUgYSBKU1ggY29udGV4dC5cbiAgICAgICAgICAgIC8vIFRoYXQncyBwbGFpbiB0ZXh0OiBkcm9wIGFueSB0b2tlbnMgbWF0Y2hlZC5cbiAgICAgICAgICAgIHZhciBwbGFpblRleHQgPSBzdHJpbmdpZnlUb2tlbih0b2tlbikgLy8gQW5kIG1lcmdlIHRleHQgd2l0aCBhZGphY2VudCB0ZXh0XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGkgPCB0b2tlbnMubGVuZ3RoIC0gMSAmJlxuICAgICAgICAgICAgICAodHlwZW9mIHRva2Vuc1tpICsgMV0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICAgICAgdG9rZW5zW2kgKyAxXS50eXBlID09PSAncGxhaW4tdGV4dCcpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcGxhaW5UZXh0ICs9IHN0cmluZ2lmeVRva2VuKHRva2Vuc1tpICsgMV0pXG4gICAgICAgICAgICAgIHRva2Vucy5zcGxpY2UoaSArIDEsIDEpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGkgPiAwICYmXG4gICAgICAgICAgICAgICh0eXBlb2YgdG9rZW5zW2kgLSAxXSA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgICAgICAgICB0b2tlbnNbaSAtIDFdLnR5cGUgPT09ICdwbGFpbi10ZXh0JylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBwbGFpblRleHQgPSBzdHJpbmdpZnlUb2tlbih0b2tlbnNbaSAtIDFdKSArIHBsYWluVGV4dFxuICAgICAgICAgICAgICB0b2tlbnMuc3BsaWNlKGkgLSAxLCAxKVxuICAgICAgICAgICAgICBpLS1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRva2Vuc1tpXSA9IG5ldyBQcmlzbS5Ub2tlbihcbiAgICAgICAgICAgICAgJ3BsYWluLXRleHQnLFxuICAgICAgICAgICAgICBwbGFpblRleHQsXG4gICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgIHBsYWluVGV4dFxuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodG9rZW4uY29udGVudCAmJiB0eXBlb2YgdG9rZW4uY29udGVudCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB3YWxrVG9rZW5zKHRva2VuLmNvbnRlbnQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgUHJpc20uaG9va3MuYWRkKCdhZnRlci10b2tlbml6ZScsIGZ1bmN0aW9uIChlbnYpIHtcbiAgICAgIGlmIChlbnYubGFuZ3VhZ2UgIT09ICdqc3gnICYmIGVudi5sYW5ndWFnZSAhPT0gJ3RzeCcpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB3YWxrVG9rZW5zKGVudi50b2tlbnMpXG4gICAgfSlcbiAgfSkoUHJpc20pXG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/jsx.js\n"));

/***/ })

}]);