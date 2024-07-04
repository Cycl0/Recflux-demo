"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_dax"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/dax.js":
/*!********************************************!*\
  !*** ./node_modules/refractor/lang/dax.js ***!
  \********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = dax\ndax.displayName = 'dax'\ndax.aliases = []\nfunction dax(Prism) {\n  Prism.languages.dax = {\n    comment: {\n      pattern: /(^|[^\\\\])(?:\\/\\*[\\s\\S]*?\\*\\/|(?:--|\\/\\/).*)/,\n      lookbehind: true\n    },\n    'data-field': {\n      pattern:\n        /'(?:[^']|'')*'(?!')(?:\\[[ \\w\\xA0-\\uFFFF]+\\])?|\\w+\\[[ \\w\\xA0-\\uFFFF]+\\]/,\n      alias: 'symbol'\n    },\n    measure: {\n      pattern: /\\[[ \\w\\xA0-\\uFFFF]+\\]/,\n      alias: 'constant'\n    },\n    string: {\n      pattern: /\"(?:[^\"]|\"\")*\"(?!\")/,\n      greedy: true\n    },\n    function:\n      /\\b(?:ABS|ACOS|ACOSH|ACOT|ACOTH|ADDCOLUMNS|ADDMISSINGITEMS|ALL|ALLCROSSFILTERED|ALLEXCEPT|ALLNOBLANKROW|ALLSELECTED|AND|APPROXIMATEDISTINCTCOUNT|ASIN|ASINH|ATAN|ATANH|AVERAGE|AVERAGEA|AVERAGEX|BETA\\.DIST|BETA\\.INV|BLANK|CALCULATE|CALCULATETABLE|CALENDAR|CALENDARAUTO|CEILING|CHISQ\\.DIST|CHISQ\\.DIST\\.RT|CHISQ\\.INV|CHISQ\\.INV\\.RT|CLOSINGBALANCEMONTH|CLOSINGBALANCEQUARTER|CLOSINGBALANCEYEAR|COALESCE|COMBIN|COMBINA|COMBINEVALUES|CONCATENATE|CONCATENATEX|CONFIDENCE\\.NORM|CONFIDENCE\\.T|CONTAINS|CONTAINSROW|CONTAINSSTRING|CONTAINSSTRINGEXACT|CONVERT|COS|COSH|COT|COTH|COUNT|COUNTA|COUNTAX|COUNTBLANK|COUNTROWS|COUNTX|CROSSFILTER|CROSSJOIN|CURRENCY|CURRENTGROUP|CUSTOMDATA|DATATABLE|DATE|DATEADD|DATEDIFF|DATESBETWEEN|DATESINPERIOD|DATESMTD|DATESQTD|DATESYTD|DATEVALUE|DAY|DEGREES|DETAILROWS|DISTINCT|DISTINCTCOUNT|DISTINCTCOUNTNOBLANK|DIVIDE|EARLIER|EARLIEST|EDATE|ENDOFMONTH|ENDOFQUARTER|ENDOFYEAR|EOMONTH|ERROR|EVEN|EXACT|EXCEPT|EXP|EXPON\\.DIST|FACT|FALSE|FILTER|FILTERS|FIND|FIRSTDATE|FIRSTNONBLANK|FIRSTNONBLANKVALUE|FIXED|FLOOR|FORMAT|GCD|GENERATE|GENERATEALL|GENERATESERIES|GEOMEAN|GEOMEANX|GROUPBY|HASONEFILTER|HASONEVALUE|HOUR|IF|IF\\.EAGER|IFERROR|IGNORE|INT|INTERSECT|ISBLANK|ISCROSSFILTERED|ISEMPTY|ISERROR|ISEVEN|ISFILTERED|ISINSCOPE|ISLOGICAL|ISNONTEXT|ISNUMBER|ISO\\.CEILING|ISODD|ISONORAFTER|ISSELECTEDMEASURE|ISSUBTOTAL|ISTEXT|KEEPFILTERS|KEYWORDMATCH|LASTDATE|LASTNONBLANK|LASTNONBLANKVALUE|LCM|LEFT|LEN|LN|LOG|LOG10|LOOKUPVALUE|LOWER|MAX|MAXA|MAXX|MEDIAN|MEDIANX|MID|MIN|MINA|MINUTE|MINX|MOD|MONTH|MROUND|NATURALINNERJOIN|NATURALLEFTOUTERJOIN|NEXTDAY|NEXTMONTH|NEXTQUARTER|NEXTYEAR|NONVISUAL|NORM\\.DIST|NORM\\.INV|NORM\\.S\\.DIST|NORM\\.S\\.INV|NOT|NOW|ODD|OPENINGBALANCEMONTH|OPENINGBALANCEQUARTER|OPENINGBALANCEYEAR|OR|PARALLELPERIOD|PATH|PATHCONTAINS|PATHITEM|PATHITEMREVERSE|PATHLENGTH|PERCENTILE\\.EXC|PERCENTILE\\.INC|PERCENTILEX\\.EXC|PERCENTILEX\\.INC|PERMUT|PI|POISSON\\.DIST|POWER|PREVIOUSDAY|PREVIOUSMONTH|PREVIOUSQUARTER|PREVIOUSYEAR|PRODUCT|PRODUCTX|QUARTER|QUOTIENT|RADIANS|RAND|RANDBETWEEN|RANK\\.EQ|RANKX|RELATED|RELATEDTABLE|REMOVEFILTERS|REPLACE|REPT|RIGHT|ROLLUP|ROLLUPADDISSUBTOTAL|ROLLUPGROUP|ROLLUPISSUBTOTAL|ROUND|ROUNDDOWN|ROUNDUP|ROW|SAMEPERIODLASTYEAR|SAMPLE|SEARCH|SECOND|SELECTCOLUMNS|SELECTEDMEASURE|SELECTEDMEASUREFORMATSTRING|SELECTEDMEASURENAME|SELECTEDVALUE|SIGN|SIN|SINH|SQRT|SQRTPI|STARTOFMONTH|STARTOFQUARTER|STARTOFYEAR|STDEV\\.P|STDEV\\.S|STDEVX\\.P|STDEVX\\.S|SUBSTITUTE|SUBSTITUTEWITHINDEX|SUM|SUMMARIZE|SUMMARIZECOLUMNS|SUMX|SWITCH|T\\.DIST|T\\.DIST\\.2T|T\\.DIST\\.RT|T\\.INV|T\\.INV\\.2T|TAN|TANH|TIME|TIMEVALUE|TODAY|TOPN|TOPNPERLEVEL|TOPNSKIP|TOTALMTD|TOTALQTD|TOTALYTD|TREATAS|TRIM|TRUE|TRUNC|UNICHAR|UNICODE|UNION|UPPER|USERELATIONSHIP|USERNAME|USEROBJECTID|USERPRINCIPALNAME|UTCNOW|UTCTODAY|VALUE|VALUES|VAR\\.P|VAR\\.S|VARX\\.P|VARX\\.S|WEEKDAY|WEEKNUM|XIRR|XNPV|YEAR|YEARFRAC)(?=\\s*\\()/i,\n    keyword:\n      /\\b(?:DEFINE|EVALUATE|MEASURE|ORDER\\s+BY|RETURN|VAR|START\\s+AT|ASC|DESC)\\b/i,\n    boolean: {\n      pattern: /\\b(?:FALSE|NULL|TRUE)\\b/i,\n      alias: 'constant'\n    },\n    number: /\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+\\b/,\n    operator: /:=|[-+*\\/=^]|&&?|\\|\\||<(?:=>?|<|>)?|>[>=]?|\\b(?:IN|NOT)\\b/i,\n    punctuation: /[;\\[\\](){}`,.]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9kYXguanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxvQkFBb0IsUUFBUTtBQUM1QjtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9kYXguanM/NTNhNCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBkYXhcbmRheC5kaXNwbGF5TmFtZSA9ICdkYXgnXG5kYXguYWxpYXNlcyA9IFtdXG5mdW5jdGlvbiBkYXgoUHJpc20pIHtcbiAgUHJpc20ubGFuZ3VhZ2VzLmRheCA9IHtcbiAgICBjb21tZW50OiB7XG4gICAgICBwYXR0ZXJuOiAvKF58W15cXFxcXSkoPzpcXC9cXCpbXFxzXFxTXSo/XFwqXFwvfCg/Oi0tfFxcL1xcLykuKikvLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgJ2RhdGEtZmllbGQnOiB7XG4gICAgICBwYXR0ZXJuOlxuICAgICAgICAvJyg/OlteJ118JycpKicoPyEnKSg/OlxcW1sgXFx3XFx4QTAtXFx1RkZGRl0rXFxdKT98XFx3K1xcW1sgXFx3XFx4QTAtXFx1RkZGRl0rXFxdLyxcbiAgICAgIGFsaWFzOiAnc3ltYm9sJ1xuICAgIH0sXG4gICAgbWVhc3VyZToge1xuICAgICAgcGF0dGVybjogL1xcW1sgXFx3XFx4QTAtXFx1RkZGRl0rXFxdLyxcbiAgICAgIGFsaWFzOiAnY29uc3RhbnQnXG4gICAgfSxcbiAgICBzdHJpbmc6IHtcbiAgICAgIHBhdHRlcm46IC9cIig/OlteXCJdfFwiXCIpKlwiKD8hXCIpLyxcbiAgICAgIGdyZWVkeTogdHJ1ZVxuICAgIH0sXG4gICAgZnVuY3Rpb246XG4gICAgICAvXFxiKD86QUJTfEFDT1N8QUNPU0h8QUNPVHxBQ09USHxBRERDT0xVTU5TfEFERE1JU1NJTkdJVEVNU3xBTEx8QUxMQ1JPU1NGSUxURVJFRHxBTExFWENFUFR8QUxMTk9CTEFOS1JPV3xBTExTRUxFQ1RFRHxBTkR8QVBQUk9YSU1BVEVESVNUSU5DVENPVU5UfEFTSU58QVNJTkh8QVRBTnxBVEFOSHxBVkVSQUdFfEFWRVJBR0VBfEFWRVJBR0VYfEJFVEFcXC5ESVNUfEJFVEFcXC5JTlZ8QkxBTkt8Q0FMQ1VMQVRFfENBTENVTEFURVRBQkxFfENBTEVOREFSfENBTEVOREFSQVVUT3xDRUlMSU5HfENISVNRXFwuRElTVHxDSElTUVxcLkRJU1RcXC5SVHxDSElTUVxcLklOVnxDSElTUVxcLklOVlxcLlJUfENMT1NJTkdCQUxBTkNFTU9OVEh8Q0xPU0lOR0JBTEFOQ0VRVUFSVEVSfENMT1NJTkdCQUxBTkNFWUVBUnxDT0FMRVNDRXxDT01CSU58Q09NQklOQXxDT01CSU5FVkFMVUVTfENPTkNBVEVOQVRFfENPTkNBVEVOQVRFWHxDT05GSURFTkNFXFwuTk9STXxDT05GSURFTkNFXFwuVHxDT05UQUlOU3xDT05UQUlOU1JPV3xDT05UQUlOU1NUUklOR3xDT05UQUlOU1NUUklOR0VYQUNUfENPTlZFUlR8Q09TfENPU0h8Q09UfENPVEh8Q09VTlR8Q09VTlRBfENPVU5UQVh8Q09VTlRCTEFOS3xDT1VOVFJPV1N8Q09VTlRYfENST1NTRklMVEVSfENST1NTSk9JTnxDVVJSRU5DWXxDVVJSRU5UR1JPVVB8Q1VTVE9NREFUQXxEQVRBVEFCTEV8REFURXxEQVRFQUREfERBVEVESUZGfERBVEVTQkVUV0VFTnxEQVRFU0lOUEVSSU9EfERBVEVTTVREfERBVEVTUVREfERBVEVTWVREfERBVEVWQUxVRXxEQVl8REVHUkVFU3xERVRBSUxST1dTfERJU1RJTkNUfERJU1RJTkNUQ09VTlR8RElTVElOQ1RDT1VOVE5PQkxBTkt8RElWSURFfEVBUkxJRVJ8RUFSTElFU1R8RURBVEV8RU5ET0ZNT05USHxFTkRPRlFVQVJURVJ8RU5ET0ZZRUFSfEVPTU9OVEh8RVJST1J8RVZFTnxFWEFDVHxFWENFUFR8RVhQfEVYUE9OXFwuRElTVHxGQUNUfEZBTFNFfEZJTFRFUnxGSUxURVJTfEZJTkR8RklSU1REQVRFfEZJUlNUTk9OQkxBTkt8RklSU1ROT05CTEFOS1ZBTFVFfEZJWEVEfEZMT09SfEZPUk1BVHxHQ0R8R0VORVJBVEV8R0VORVJBVEVBTEx8R0VORVJBVEVTRVJJRVN8R0VPTUVBTnxHRU9NRUFOWHxHUk9VUEJZfEhBU09ORUZJTFRFUnxIQVNPTkVWQUxVRXxIT1VSfElGfElGXFwuRUFHRVJ8SUZFUlJPUnxJR05PUkV8SU5UfElOVEVSU0VDVHxJU0JMQU5LfElTQ1JPU1NGSUxURVJFRHxJU0VNUFRZfElTRVJST1J8SVNFVkVOfElTRklMVEVSRUR8SVNJTlNDT1BFfElTTE9HSUNBTHxJU05PTlRFWFR8SVNOVU1CRVJ8SVNPXFwuQ0VJTElOR3xJU09ERHxJU09OT1JBRlRFUnxJU1NFTEVDVEVETUVBU1VSRXxJU1NVQlRPVEFMfElTVEVYVHxLRUVQRklMVEVSU3xLRVlXT1JETUFUQ0h8TEFTVERBVEV8TEFTVE5PTkJMQU5LfExBU1ROT05CTEFOS1ZBTFVFfExDTXxMRUZUfExFTnxMTnxMT0d8TE9HMTB8TE9PS1VQVkFMVUV8TE9XRVJ8TUFYfE1BWEF8TUFYWHxNRURJQU58TUVESUFOWHxNSUR8TUlOfE1JTkF8TUlOVVRFfE1JTlh8TU9EfE1PTlRIfE1ST1VORHxOQVRVUkFMSU5ORVJKT0lOfE5BVFVSQUxMRUZUT1VURVJKT0lOfE5FWFREQVl8TkVYVE1PTlRIfE5FWFRRVUFSVEVSfE5FWFRZRUFSfE5PTlZJU1VBTHxOT1JNXFwuRElTVHxOT1JNXFwuSU5WfE5PUk1cXC5TXFwuRElTVHxOT1JNXFwuU1xcLklOVnxOT1R8Tk9XfE9ERHxPUEVOSU5HQkFMQU5DRU1PTlRIfE9QRU5JTkdCQUxBTkNFUVVBUlRFUnxPUEVOSU5HQkFMQU5DRVlFQVJ8T1J8UEFSQUxMRUxQRVJJT0R8UEFUSHxQQVRIQ09OVEFJTlN8UEFUSElURU18UEFUSElURU1SRVZFUlNFfFBBVEhMRU5HVEh8UEVSQ0VOVElMRVxcLkVYQ3xQRVJDRU5USUxFXFwuSU5DfFBFUkNFTlRJTEVYXFwuRVhDfFBFUkNFTlRJTEVYXFwuSU5DfFBFUk1VVHxQSXxQT0lTU09OXFwuRElTVHxQT1dFUnxQUkVWSU9VU0RBWXxQUkVWSU9VU01PTlRIfFBSRVZJT1VTUVVBUlRFUnxQUkVWSU9VU1lFQVJ8UFJPRFVDVHxQUk9EVUNUWHxRVUFSVEVSfFFVT1RJRU5UfFJBRElBTlN8UkFORHxSQU5EQkVUV0VFTnxSQU5LXFwuRVF8UkFOS1h8UkVMQVRFRHxSRUxBVEVEVEFCTEV8UkVNT1ZFRklMVEVSU3xSRVBMQUNFfFJFUFR8UklHSFR8Uk9MTFVQfFJPTExVUEFERElTU1VCVE9UQUx8Uk9MTFVQR1JPVVB8Uk9MTFVQSVNTVUJUT1RBTHxST1VORHxST1VORERPV058Uk9VTkRVUHxST1d8U0FNRVBFUklPRExBU1RZRUFSfFNBTVBMRXxTRUFSQ0h8U0VDT05EfFNFTEVDVENPTFVNTlN8U0VMRUNURURNRUFTVVJFfFNFTEVDVEVETUVBU1VSRUZPUk1BVFNUUklOR3xTRUxFQ1RFRE1FQVNVUkVOQU1FfFNFTEVDVEVEVkFMVUV8U0lHTnxTSU58U0lOSHxTUVJUfFNRUlRQSXxTVEFSVE9GTU9OVEh8U1RBUlRPRlFVQVJURVJ8U1RBUlRPRllFQVJ8U1RERVZcXC5QfFNUREVWXFwuU3xTVERFVlhcXC5QfFNUREVWWFxcLlN8U1VCU1RJVFVURXxTVUJTVElUVVRFV0lUSElOREVYfFNVTXxTVU1NQVJJWkV8U1VNTUFSSVpFQ09MVU1OU3xTVU1YfFNXSVRDSHxUXFwuRElTVHxUXFwuRElTVFxcLjJUfFRcXC5ESVNUXFwuUlR8VFxcLklOVnxUXFwuSU5WXFwuMlR8VEFOfFRBTkh8VElNRXxUSU1FVkFMVUV8VE9EQVl8VE9QTnxUT1BOUEVSTEVWRUx8VE9QTlNLSVB8VE9UQUxNVER8VE9UQUxRVER8VE9UQUxZVER8VFJFQVRBU3xUUklNfFRSVUV8VFJVTkN8VU5JQ0hBUnxVTklDT0RFfFVOSU9OfFVQUEVSfFVTRVJFTEFUSU9OU0hJUHxVU0VSTkFNRXxVU0VST0JKRUNUSUR8VVNFUlBSSU5DSVBBTE5BTUV8VVRDTk9XfFVUQ1RPREFZfFZBTFVFfFZBTFVFU3xWQVJcXC5QfFZBUlxcLlN8VkFSWFxcLlB8VkFSWFxcLlN8V0VFS0RBWXxXRUVLTlVNfFhJUlJ8WE5QVnxZRUFSfFlFQVJGUkFDKSg/PVxccypcXCgpL2ksXG4gICAga2V5d29yZDpcbiAgICAgIC9cXGIoPzpERUZJTkV8RVZBTFVBVEV8TUVBU1VSRXxPUkRFUlxccytCWXxSRVRVUk58VkFSfFNUQVJUXFxzK0FUfEFTQ3xERVNDKVxcYi9pLFxuICAgIGJvb2xlYW46IHtcbiAgICAgIHBhdHRlcm46IC9cXGIoPzpGQUxTRXxOVUxMfFRSVUUpXFxiL2ksXG4gICAgICBhbGlhczogJ2NvbnN0YW50J1xuICAgIH0sXG4gICAgbnVtYmVyOiAvXFxiXFxkKyg/OlxcLlxcZCopP3xcXEJcXC5cXGQrXFxiLyxcbiAgICBvcGVyYXRvcjogLzo9fFstKypcXC89Xl18JiY/fFxcfFxcfHw8KD86PT4/fDx8Pik/fD5bPj1dP3xcXGIoPzpJTnxOT1QpXFxiL2ksXG4gICAgcHVuY3R1YXRpb246IC9bO1xcW1xcXSgpe31gLC5dL1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/dax.js\n"));

/***/ })

}]);