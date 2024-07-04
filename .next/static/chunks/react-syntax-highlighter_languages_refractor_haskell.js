"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_haskell"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/haskell.js":
/*!************************************************!*\
  !*** ./node_modules/refractor/lang/haskell.js ***!
  \************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = haskell\nhaskell.displayName = 'haskell'\nhaskell.aliases = ['hs']\nfunction haskell(Prism) {\n  Prism.languages.haskell = {\n    comment: {\n      pattern:\n        /(^|[^-!#$%*+=?&@|~.:<>^\\\\\\/])(?:--(?:(?=.)[^-!#$%*+=?&@|~.:<>^\\\\\\/].*|$)|\\{-[\\s\\S]*?-\\})/m,\n      lookbehind: true\n    },\n    char: {\n      pattern:\n        /'(?:[^\\\\']|\\\\(?:[abfnrtv\\\\\"'&]|\\^[A-Z@[\\]^_]|ACK|BEL|BS|CAN|CR|DC1|DC2|DC3|DC4|DEL|DLE|EM|ENQ|EOT|ESC|ETB|ETX|FF|FS|GS|HT|LF|NAK|NUL|RS|SI|SO|SOH|SP|STX|SUB|SYN|US|VT|\\d+|o[0-7]+|x[0-9a-fA-F]+))'/,\n      alias: 'string'\n    },\n    string: {\n      pattern: /\"(?:[^\\\\\"]|\\\\(?:\\S|\\s+\\\\))*\"/,\n      greedy: true\n    },\n    keyword:\n      /\\b(?:case|class|data|deriving|do|else|if|in|infixl|infixr|instance|let|module|newtype|of|primitive|then|type|where)\\b/,\n    'import-statement': {\n      // The imported or hidden names are not included in this import\n      // statement. This is because we want to highlight those exactly like\n      // we do for the names in the program.\n      pattern:\n        /(^[\\t ]*)import\\s+(?:qualified\\s+)?(?:[A-Z][\\w']*)(?:\\.[A-Z][\\w']*)*(?:\\s+as\\s+(?:[A-Z][\\w']*)(?:\\.[A-Z][\\w']*)*)?(?:\\s+hiding\\b)?/m,\n      lookbehind: true,\n      inside: {\n        keyword: /\\b(?:as|hiding|import|qualified)\\b/,\n        punctuation: /\\./\n      }\n    },\n    // These are builtin variables only. Constructors are highlighted later as a constant.\n    builtin:\n      /\\b(?:abs|acos|acosh|all|and|any|appendFile|approxRational|asTypeOf|asin|asinh|atan|atan2|atanh|basicIORun|break|catch|ceiling|chr|compare|concat|concatMap|const|cos|cosh|curry|cycle|decodeFloat|denominator|digitToInt|div|divMod|drop|dropWhile|either|elem|encodeFloat|enumFrom|enumFromThen|enumFromThenTo|enumFromTo|error|even|exp|exponent|fail|filter|flip|floatDigits|floatRadix|floatRange|floor|fmap|foldl|foldl1|foldr|foldr1|fromDouble|fromEnum|fromInt|fromInteger|fromIntegral|fromRational|fst|gcd|getChar|getContents|getLine|group|head|id|inRange|index|init|intToDigit|interact|ioError|isAlpha|isAlphaNum|isAscii|isControl|isDenormalized|isDigit|isHexDigit|isIEEE|isInfinite|isLower|isNaN|isNegativeZero|isOctDigit|isPrint|isSpace|isUpper|iterate|last|lcm|length|lex|lexDigits|lexLitChar|lines|log|logBase|lookup|map|mapM|mapM_|max|maxBound|maximum|maybe|min|minBound|minimum|mod|negate|not|notElem|null|numerator|odd|or|ord|otherwise|pack|pi|pred|primExitWith|print|product|properFraction|putChar|putStr|putStrLn|quot|quotRem|range|rangeSize|read|readDec|readFile|readFloat|readHex|readIO|readInt|readList|readLitChar|readLn|readOct|readParen|readSigned|reads|readsPrec|realToFrac|recip|rem|repeat|replicate|return|reverse|round|scaleFloat|scanl|scanl1|scanr|scanr1|seq|sequence|sequence_|show|showChar|showInt|showList|showLitChar|showParen|showSigned|showString|shows|showsPrec|significand|signum|sin|sinh|snd|sort|span|splitAt|sqrt|subtract|succ|sum|tail|take|takeWhile|tan|tanh|threadToIOResult|toEnum|toInt|toInteger|toLower|toRational|toUpper|truncate|uncurry|undefined|unlines|until|unwords|unzip|unzip3|userError|words|writeFile|zip|zip3|zipWith|zipWith3)\\b/,\n    // decimal integers and floating point numbers | octal integers | hexadecimal integers\n    number: /\\b(?:\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?|0o[0-7]+|0x[0-9a-f]+)\\b/i,\n    operator: [\n      {\n        // infix operator\n        pattern: /`(?:[A-Z][\\w']*\\.)*[_a-z][\\w']*`/,\n        greedy: true\n      },\n      {\n        // function composition\n        pattern: /(\\s)\\.(?=\\s)/,\n        lookbehind: true\n      }, // Most of this is needed because of the meaning of a single '.'.\n      // If it stands alone freely, it is the function composition.\n      // It may also be a separator between a module name and an identifier => no\n      // operator. If it comes together with other special characters it is an\n      // operator too.\n      //\n      // This regex means: /[-!#$%*+=?&@|~.:<>^\\\\\\/]+/ without /\\./.\n      /[-!#$%*+=?&@|~:<>^\\\\\\/][-!#$%*+=?&@|~.:<>^\\\\\\/]*|\\.[-!#$%*+=?&@|~.:<>^\\\\\\/]+/\n    ],\n    // In Haskell, nearly everything is a variable, do not highlight these.\n    hvariable: {\n      pattern: /\\b(?:[A-Z][\\w']*\\.)*[_a-z][\\w']*/,\n      inside: {\n        punctuation: /\\./\n      }\n    },\n    constant: {\n      pattern: /\\b(?:[A-Z][\\w']*\\.)*[A-Z][\\w']*/,\n      inside: {\n        punctuation: /\\./\n      }\n    },\n    punctuation: /[{}[\\];(),.:]/\n  }\n  Prism.languages.hs = Prism.languages.haskell\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9oYXNrZWxsLmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0ZBQW9GLFlBQVk7QUFDaEc7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxxQkFBcUIsSUFBSTtBQUN6QjtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL2hhc2tlbGwuanM/YmJkMSJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBoYXNrZWxsXG5oYXNrZWxsLmRpc3BsYXlOYW1lID0gJ2hhc2tlbGwnXG5oYXNrZWxsLmFsaWFzZXMgPSBbJ2hzJ11cbmZ1bmN0aW9uIGhhc2tlbGwoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLmhhc2tlbGwgPSB7XG4gICAgY29tbWVudDoge1xuICAgICAgcGF0dGVybjpcbiAgICAgICAgLyhefFteLSEjJCUqKz0/JkB8fi46PD5eXFxcXFxcL10pKD86LS0oPzooPz0uKVteLSEjJCUqKz0/JkB8fi46PD5eXFxcXFxcL10uKnwkKXxcXHstW1xcc1xcU10qPy1cXH0pL20sXG4gICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgfSxcbiAgICBjaGFyOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvJyg/OlteXFxcXCddfFxcXFwoPzpbYWJmbnJ0dlxcXFxcIicmXXxcXF5bQS1aQFtcXF1eX118QUNLfEJFTHxCU3xDQU58Q1J8REMxfERDMnxEQzN8REM0fERFTHxETEV8RU18RU5RfEVPVHxFU0N8RVRCfEVUWHxGRnxGU3xHU3xIVHxMRnxOQUt8TlVMfFJTfFNJfFNPfFNPSHxTUHxTVFh8U1VCfFNZTnxVU3xWVHxcXGQrfG9bMC03XSt8eFswLTlhLWZBLUZdKykpJy8sXG4gICAgICBhbGlhczogJ3N0cmluZydcbiAgICB9LFxuICAgIHN0cmluZzoge1xuICAgICAgcGF0dGVybjogL1wiKD86W15cXFxcXCJdfFxcXFwoPzpcXFN8XFxzK1xcXFwpKSpcIi8sXG4gICAgICBncmVlZHk6IHRydWVcbiAgICB9LFxuICAgIGtleXdvcmQ6XG4gICAgICAvXFxiKD86Y2FzZXxjbGFzc3xkYXRhfGRlcml2aW5nfGRvfGVsc2V8aWZ8aW58aW5maXhsfGluZml4cnxpbnN0YW5jZXxsZXR8bW9kdWxlfG5ld3R5cGV8b2Z8cHJpbWl0aXZlfHRoZW58dHlwZXx3aGVyZSlcXGIvLFxuICAgICdpbXBvcnQtc3RhdGVtZW50Jzoge1xuICAgICAgLy8gVGhlIGltcG9ydGVkIG9yIGhpZGRlbiBuYW1lcyBhcmUgbm90IGluY2x1ZGVkIGluIHRoaXMgaW1wb3J0XG4gICAgICAvLyBzdGF0ZW1lbnQuIFRoaXMgaXMgYmVjYXVzZSB3ZSB3YW50IHRvIGhpZ2hsaWdodCB0aG9zZSBleGFjdGx5IGxpa2VcbiAgICAgIC8vIHdlIGRvIGZvciB0aGUgbmFtZXMgaW4gdGhlIHByb2dyYW0uXG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvKF5bXFx0IF0qKWltcG9ydFxccysoPzpxdWFsaWZpZWRcXHMrKT8oPzpbQS1aXVtcXHcnXSopKD86XFwuW0EtWl1bXFx3J10qKSooPzpcXHMrYXNcXHMrKD86W0EtWl1bXFx3J10qKSg/OlxcLltBLVpdW1xcdyddKikqKT8oPzpcXHMraGlkaW5nXFxiKT8vbSxcbiAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICBpbnNpZGU6IHtcbiAgICAgICAga2V5d29yZDogL1xcYig/OmFzfGhpZGluZ3xpbXBvcnR8cXVhbGlmaWVkKVxcYi8sXG4gICAgICAgIHB1bmN0dWF0aW9uOiAvXFwuL1xuICAgICAgfVxuICAgIH0sXG4gICAgLy8gVGhlc2UgYXJlIGJ1aWx0aW4gdmFyaWFibGVzIG9ubHkuIENvbnN0cnVjdG9ycyBhcmUgaGlnaGxpZ2h0ZWQgbGF0ZXIgYXMgYSBjb25zdGFudC5cbiAgICBidWlsdGluOlxuICAgICAgL1xcYig/OmFic3xhY29zfGFjb3NofGFsbHxhbmR8YW55fGFwcGVuZEZpbGV8YXBwcm94UmF0aW9uYWx8YXNUeXBlT2Z8YXNpbnxhc2luaHxhdGFufGF0YW4yfGF0YW5ofGJhc2ljSU9SdW58YnJlYWt8Y2F0Y2h8Y2VpbGluZ3xjaHJ8Y29tcGFyZXxjb25jYXR8Y29uY2F0TWFwfGNvbnN0fGNvc3xjb3NofGN1cnJ5fGN5Y2xlfGRlY29kZUZsb2F0fGRlbm9taW5hdG9yfGRpZ2l0VG9JbnR8ZGl2fGRpdk1vZHxkcm9wfGRyb3BXaGlsZXxlaXRoZXJ8ZWxlbXxlbmNvZGVGbG9hdHxlbnVtRnJvbXxlbnVtRnJvbVRoZW58ZW51bUZyb21UaGVuVG98ZW51bUZyb21Ub3xlcnJvcnxldmVufGV4cHxleHBvbmVudHxmYWlsfGZpbHRlcnxmbGlwfGZsb2F0RGlnaXRzfGZsb2F0UmFkaXh8ZmxvYXRSYW5nZXxmbG9vcnxmbWFwfGZvbGRsfGZvbGRsMXxmb2xkcnxmb2xkcjF8ZnJvbURvdWJsZXxmcm9tRW51bXxmcm9tSW50fGZyb21JbnRlZ2VyfGZyb21JbnRlZ3JhbHxmcm9tUmF0aW9uYWx8ZnN0fGdjZHxnZXRDaGFyfGdldENvbnRlbnRzfGdldExpbmV8Z3JvdXB8aGVhZHxpZHxpblJhbmdlfGluZGV4fGluaXR8aW50VG9EaWdpdHxpbnRlcmFjdHxpb0Vycm9yfGlzQWxwaGF8aXNBbHBoYU51bXxpc0FzY2lpfGlzQ29udHJvbHxpc0Rlbm9ybWFsaXplZHxpc0RpZ2l0fGlzSGV4RGlnaXR8aXNJRUVFfGlzSW5maW5pdGV8aXNMb3dlcnxpc05hTnxpc05lZ2F0aXZlWmVyb3xpc09jdERpZ2l0fGlzUHJpbnR8aXNTcGFjZXxpc1VwcGVyfGl0ZXJhdGV8bGFzdHxsY218bGVuZ3RofGxleHxsZXhEaWdpdHN8bGV4TGl0Q2hhcnxsaW5lc3xsb2d8bG9nQmFzZXxsb29rdXB8bWFwfG1hcE18bWFwTV98bWF4fG1heEJvdW5kfG1heGltdW18bWF5YmV8bWlufG1pbkJvdW5kfG1pbmltdW18bW9kfG5lZ2F0ZXxub3R8bm90RWxlbXxudWxsfG51bWVyYXRvcnxvZGR8b3J8b3JkfG90aGVyd2lzZXxwYWNrfHBpfHByZWR8cHJpbUV4aXRXaXRofHByaW50fHByb2R1Y3R8cHJvcGVyRnJhY3Rpb258cHV0Q2hhcnxwdXRTdHJ8cHV0U3RyTG58cXVvdHxxdW90UmVtfHJhbmdlfHJhbmdlU2l6ZXxyZWFkfHJlYWREZWN8cmVhZEZpbGV8cmVhZEZsb2F0fHJlYWRIZXh8cmVhZElPfHJlYWRJbnR8cmVhZExpc3R8cmVhZExpdENoYXJ8cmVhZExufHJlYWRPY3R8cmVhZFBhcmVufHJlYWRTaWduZWR8cmVhZHN8cmVhZHNQcmVjfHJlYWxUb0ZyYWN8cmVjaXB8cmVtfHJlcGVhdHxyZXBsaWNhdGV8cmV0dXJufHJldmVyc2V8cm91bmR8c2NhbGVGbG9hdHxzY2FubHxzY2FubDF8c2NhbnJ8c2NhbnIxfHNlcXxzZXF1ZW5jZXxzZXF1ZW5jZV98c2hvd3xzaG93Q2hhcnxzaG93SW50fHNob3dMaXN0fHNob3dMaXRDaGFyfHNob3dQYXJlbnxzaG93U2lnbmVkfHNob3dTdHJpbmd8c2hvd3N8c2hvd3NQcmVjfHNpZ25pZmljYW5kfHNpZ251bXxzaW58c2luaHxzbmR8c29ydHxzcGFufHNwbGl0QXR8c3FydHxzdWJ0cmFjdHxzdWNjfHN1bXx0YWlsfHRha2V8dGFrZVdoaWxlfHRhbnx0YW5ofHRocmVhZFRvSU9SZXN1bHR8dG9FbnVtfHRvSW50fHRvSW50ZWdlcnx0b0xvd2VyfHRvUmF0aW9uYWx8dG9VcHBlcnx0cnVuY2F0ZXx1bmN1cnJ5fHVuZGVmaW5lZHx1bmxpbmVzfHVudGlsfHVud29yZHN8dW56aXB8dW56aXAzfHVzZXJFcnJvcnx3b3Jkc3x3cml0ZUZpbGV8emlwfHppcDN8emlwV2l0aHx6aXBXaXRoMylcXGIvLFxuICAgIC8vIGRlY2ltYWwgaW50ZWdlcnMgYW5kIGZsb2F0aW5nIHBvaW50IG51bWJlcnMgfCBvY3RhbCBpbnRlZ2VycyB8IGhleGFkZWNpbWFsIGludGVnZXJzXG4gICAgbnVtYmVyOiAvXFxiKD86XFxkKyg/OlxcLlxcZCspPyg/OmVbKy1dP1xcZCspP3wwb1swLTddK3wweFswLTlhLWZdKylcXGIvaSxcbiAgICBvcGVyYXRvcjogW1xuICAgICAge1xuICAgICAgICAvLyBpbmZpeCBvcGVyYXRvclxuICAgICAgICBwYXR0ZXJuOiAvYCg/OltBLVpdW1xcdyddKlxcLikqW19hLXpdW1xcdyddKmAvLFxuICAgICAgICBncmVlZHk6IHRydWVcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIGZ1bmN0aW9uIGNvbXBvc2l0aW9uXG4gICAgICAgIHBhdHRlcm46IC8oXFxzKVxcLig/PVxccykvLFxuICAgICAgICBsb29rYmVoaW5kOiB0cnVlXG4gICAgICB9LCAvLyBNb3N0IG9mIHRoaXMgaXMgbmVlZGVkIGJlY2F1c2Ugb2YgdGhlIG1lYW5pbmcgb2YgYSBzaW5nbGUgJy4nLlxuICAgICAgLy8gSWYgaXQgc3RhbmRzIGFsb25lIGZyZWVseSwgaXQgaXMgdGhlIGZ1bmN0aW9uIGNvbXBvc2l0aW9uLlxuICAgICAgLy8gSXQgbWF5IGFsc28gYmUgYSBzZXBhcmF0b3IgYmV0d2VlbiBhIG1vZHVsZSBuYW1lIGFuZCBhbiBpZGVudGlmaWVyID0+IG5vXG4gICAgICAvLyBvcGVyYXRvci4gSWYgaXQgY29tZXMgdG9nZXRoZXIgd2l0aCBvdGhlciBzcGVjaWFsIGNoYXJhY3RlcnMgaXQgaXMgYW5cbiAgICAgIC8vIG9wZXJhdG9yIHRvby5cbiAgICAgIC8vXG4gICAgICAvLyBUaGlzIHJlZ2V4IG1lYW5zOiAvWy0hIyQlKis9PyZAfH4uOjw+XlxcXFxcXC9dKy8gd2l0aG91dCAvXFwuLy5cbiAgICAgIC9bLSEjJCUqKz0/JkB8fjo8Pl5cXFxcXFwvXVstISMkJSorPT8mQHx+Ljo8Pl5cXFxcXFwvXSp8XFwuWy0hIyQlKis9PyZAfH4uOjw+XlxcXFxcXC9dKy9cbiAgICBdLFxuICAgIC8vIEluIEhhc2tlbGwsIG5lYXJseSBldmVyeXRoaW5nIGlzIGEgdmFyaWFibGUsIGRvIG5vdCBoaWdobGlnaHQgdGhlc2UuXG4gICAgaHZhcmlhYmxlOiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiKD86W0EtWl1bXFx3J10qXFwuKSpbX2Etel1bXFx3J10qLyxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBwdW5jdHVhdGlvbjogL1xcLi9cbiAgICAgIH1cbiAgICB9LFxuICAgIGNvbnN0YW50OiB7XG4gICAgICBwYXR0ZXJuOiAvXFxiKD86W0EtWl1bXFx3J10qXFwuKSpbQS1aXVtcXHcnXSovLFxuICAgICAgaW5zaWRlOiB7XG4gICAgICAgIHB1bmN0dWF0aW9uOiAvXFwuL1xuICAgICAgfVxuICAgIH0sXG4gICAgcHVuY3R1YXRpb246IC9be31bXFxdOygpLC46XS9cbiAgfVxuICBQcmlzbS5sYW5ndWFnZXMuaHMgPSBQcmlzbS5sYW5ndWFnZXMuaGFza2VsbFxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/haskell.js\n"));

/***/ })

}]);