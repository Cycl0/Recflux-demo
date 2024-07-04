"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["react-syntax-highlighter_languages_refractor_sql"],{

/***/ "(app-pages-browser)/./node_modules/refractor/lang/sql.js":
/*!********************************************!*\
  !*** ./node_modules/refractor/lang/sql.js ***!
  \********************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("\n\nmodule.exports = sql\nsql.displayName = 'sql'\nsql.aliases = []\nfunction sql(Prism) {\n  Prism.languages.sql = {\n    comment: {\n      pattern: /(^|[^\\\\])(?:\\/\\*[\\s\\S]*?\\*\\/|(?:--|\\/\\/|#).*)/,\n      lookbehind: true\n    },\n    variable: [\n      {\n        pattern: /@([\"'`])(?:\\\\[\\s\\S]|(?!\\1)[^\\\\])+\\1/,\n        greedy: true\n      },\n      /@[\\w.$]+/\n    ],\n    string: {\n      pattern: /(^|[^@\\\\])(\"|')(?:\\\\[\\s\\S]|(?!\\2)[^\\\\]|\\2\\2)*\\2/,\n      greedy: true,\n      lookbehind: true\n    },\n    identifier: {\n      pattern: /(^|[^@\\\\])`(?:\\\\[\\s\\S]|[^`\\\\]|``)*`/,\n      greedy: true,\n      lookbehind: true,\n      inside: {\n        punctuation: /^`|`$/\n      }\n    },\n    function:\n      /\\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\\s*\\()/i,\n    // Should we highlight user defined functions too?\n    keyword:\n      /\\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\\b/i,\n    boolean: /\\b(?:FALSE|NULL|TRUE)\\b/i,\n    number: /\\b0x[\\da-f]+\\b|\\b\\d+(?:\\.\\d*)?|\\B\\.\\d+\\b/i,\n    operator:\n      /[-+*\\/=%^~]|&&?|\\|\\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\\b/i,\n    punctuation: /[;[\\]()`,.]/\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9yZWZyYWN0b3IvbGFuZy9zcWwuanMiLCJtYXBwaW5ncyI6IkFBQVk7O0FBRVo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CO0FBQ3BCO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vbm9kZV9tb2R1bGVzL3JlZnJhY3Rvci9sYW5nL3NxbC5qcz9mMWU0Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNxbFxuc3FsLmRpc3BsYXlOYW1lID0gJ3NxbCdcbnNxbC5hbGlhc2VzID0gW11cbmZ1bmN0aW9uIHNxbChQcmlzbSkge1xuICBQcmlzbS5sYW5ndWFnZXMuc3FsID0ge1xuICAgIGNvbW1lbnQ6IHtcbiAgICAgIHBhdHRlcm46IC8oXnxbXlxcXFxdKSg/OlxcL1xcKltcXHNcXFNdKj9cXCpcXC98KD86LS18XFwvXFwvfCMpLiopLyxcbiAgICAgIGxvb2tiZWhpbmQ6IHRydWVcbiAgICB9LFxuICAgIHZhcmlhYmxlOiBbXG4gICAgICB7XG4gICAgICAgIHBhdHRlcm46IC9AKFtcIidgXSkoPzpcXFxcW1xcc1xcU118KD8hXFwxKVteXFxcXF0pK1xcMS8sXG4gICAgICAgIGdyZWVkeTogdHJ1ZVxuICAgICAgfSxcbiAgICAgIC9AW1xcdy4kXSsvXG4gICAgXSxcbiAgICBzdHJpbmc6IHtcbiAgICAgIHBhdHRlcm46IC8oXnxbXkBcXFxcXSkoXCJ8JykoPzpcXFxcW1xcc1xcU118KD8hXFwyKVteXFxcXF18XFwyXFwyKSpcXDIvLFxuICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZVxuICAgIH0sXG4gICAgaWRlbnRpZmllcjoge1xuICAgICAgcGF0dGVybjogLyhefFteQFxcXFxdKWAoPzpcXFxcW1xcc1xcU118W15gXFxcXF18YGApKmAvLFxuICAgICAgZ3JlZWR5OiB0cnVlLFxuICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgIGluc2lkZToge1xuICAgICAgICBwdW5jdHVhdGlvbjogL15gfGAkL1xuICAgICAgfVxuICAgIH0sXG4gICAgZnVuY3Rpb246XG4gICAgICAvXFxiKD86QVZHfENPVU5UfEZJUlNUfEZPUk1BVHxMQVNUfExDQVNFfExFTnxNQVh8TUlEfE1JTnxNT0R8Tk9XfFJPVU5EfFNVTXxVQ0FTRSkoPz1cXHMqXFwoKS9pLFxuICAgIC8vIFNob3VsZCB3ZSBoaWdobGlnaHQgdXNlciBkZWZpbmVkIGZ1bmN0aW9ucyB0b28/XG4gICAga2V5d29yZDpcbiAgICAgIC9cXGIoPzpBQ1RJT058QUREfEFGVEVSfEFMR09SSVRITXxBTEx8QUxURVJ8QU5BTFlaRXxBTll8QVBQTFl8QVN8QVNDfEFVVEhPUklaQVRJT058QVVUT19JTkNSRU1FTlR8QkFDS1VQfEJEQnxCRUdJTnxCRVJLRUxFWURCfEJJR0lOVHxCSU5BUll8QklUfEJMT0J8Qk9PTHxCT09MRUFOfEJSRUFLfEJST1dTRXxCVFJFRXxCVUxLfEJZfENBTEx8Q0FTQ0FERUQ/fENBU0V8Q0hBSU58Q0hBUig/OkFDVEVSfFNFVCk/fENIRUNLKD86UE9JTlQpP3xDTE9TRXxDTFVTVEVSRUR8Q09BTEVTQ0V8Q09MTEFURXxDT0xVTU5TP3xDT01NRU5UfENPTU1JVCg/OlRFRCk/fENPTVBVVEV8Q09OTkVDVHxDT05TSVNURU5UfENPTlNUUkFJTlR8Q09OVEFJTlMoPzpUQUJMRSk/fENPTlRJTlVFfENPTlZFUlR8Q1JFQVRFfENST1NTfENVUlJFTlQoPzpfREFURXxfVElNRXxfVElNRVNUQU1QfF9VU0VSKT98Q1VSU09SfENZQ0xFfERBVEEoPzpCQVNFUz8pP3xEQVRFKD86VElNRSk/fERBWXxEQkNDfERFQUxMT0NBVEV8REVDfERFQ0lNQUx8REVDTEFSRXxERUZBVUxUfERFRklORVJ8REVMQVlFRHxERUxFVEV8REVMSU1JVEVSUz98REVOWXxERVNDfERFU0NSSUJFfERFVEVSTUlOSVNUSUN8RElTQUJMRXxESVNDQVJEfERJU0t8RElTVElOQ1R8RElTVElOQ1RST1d8RElTVFJJQlVURUR8RE98RE9VQkxFfERST1B8RFVNTVl8RFVNUCg/OkZJTEUpP3xEVVBMSUNBVEV8RUxTRSg/OklGKT98RU5BQkxFfEVOQ0xPU0VEfEVORHxFTkdJTkV8RU5VTXxFUlJMVkx8RVJST1JTfEVTQ0FQRUQ/fEVYQ0VQVHxFWEVDKD86VVRFKT98RVhJU1RTfEVYSVR8RVhQTEFJTnxFWFRFTkRFRHxGRVRDSHxGSUVMRFN8RklMRXxGSUxMRkFDVE9SfEZJUlNUfEZJWEVEfEZMT0FUfEZPTExPV0lOR3xGT1IoPzogRUFDSCBST1cpP3xGT1JDRXxGT1JFSUdOfEZSRUVURVhUKD86VEFCTEUpP3xGUk9NfEZVTEx8RlVOQ1RJT058R0VPTUVUUlkoPzpDT0xMRUNUSU9OKT98R0xPQkFMfEdPVE98R1JBTlR8R1JPVVB8SEFORExFUnxIQVNIfEhBVklOR3xIT0xETE9DS3xIT1VSfElERU5USVRZKD86Q09MfF9JTlNFUlQpP3xJRnxJR05PUkV8SU1QT1JUfElOREVYfElORklMRXxJTk5FUnxJTk5PREJ8SU5PVVR8SU5TRVJUfElOVHxJTlRFR0VSfElOVEVSU0VDVHxJTlRFUlZBTHxJTlRPfElOVk9LRVJ8SVNPTEFUSU9OfElURVJBVEV8Sk9JTnxLRVlTP3xLSUxMfExBTkdVQUdFfExBU1R8TEVBVkV8TEVGVHxMRVZFTHxMSU1JVHxMSU5FTk98TElORVN8TElORVNUUklOR3xMT0FEfExPQ0FMfExPQ0t8TE9ORyg/OkJMT0J8VEVYVCl8TE9PUHxNQVRDSCg/OkVEKT98TUVESVVNKD86QkxPQnxJTlR8VEVYVCl8TUVSR0V8TUlERExFSU5UfE1JTlVURXxNT0RFfE1PRElGSUVTfE1PRElGWXxNT05USHxNVUxUSSg/OkxJTkVTVFJJTkd8UE9JTlR8UE9MWUdPTil8TkFUSU9OQUx8TkFUVVJBTHxOQ0hBUnxORVhUfE5PfE5PTkNMVVNURVJFRHxOVUxMSUZ8TlVNRVJJQ3xPRkY/fE9GRlNFVFM/fE9OfE9QRU4oPzpEQVRBU09VUkNFfFFVRVJZfFJPV1NFVCk/fE9QVElNSVpFfE9QVElPTig/OkFMTFkpP3xPUkRFUnxPVVQoPzpFUnxGSUxFKT98T1ZFUnxQQVJUSUFMfFBBUlRJVElPTnxQRVJDRU5UfFBJVk9UfFBMQU58UE9JTlR8UE9MWUdPTnxQUkVDRURJTkd8UFJFQ0lTSU9OfFBSRVBBUkV8UFJFVnxQUklNQVJZfFBSSU5UfFBSSVZJTEVHRVN8UFJPQyg/OkVEVVJFKT98UFVCTElDfFBVUkdFfFFVSUNLfFJBSVNFUlJPUnxSRUFEUz98UkVBTHxSRUNPTkZJR1VSRXxSRUZFUkVOQ0VTfFJFTEVBU0V8UkVOQU1FfFJFUEVBVCg/OkFCTEUpP3xSRVBMQUNFfFJFUExJQ0FUSU9OfFJFUVVJUkV8UkVTSUdOQUx8UkVTVE9SRXxSRVNUUklDVHxSRVRVUk4oPzpJTkd8Uyk/fFJFVk9LRXxSSUdIVHxST0xMQkFDS3xST1VUSU5FfFJPVyg/OkNPVU5UfEdVSURDT0x8Uyk/fFJUUkVFfFJVTEV8U0FWRSg/OlBPSU5UKT98U0NIRU1BfFNFQ09ORHxTRUxFQ1R8U0VSSUFMKD86SVpBQkxFKT98U0VTU0lPTig/Ol9VU0VSKT98U0VUKD86VVNFUik/fFNIQVJFfFNIT1d8U0hVVERPV058U0lNUExFfFNNQUxMSU5UfFNOQVBTSE9UfFNPTUV8U09OQU1FfFNRTHxTVEFSVCg/OklORyk/fFNUQVRJU1RJQ1N8U1RBVFVTfFNUUklQRUR8U1lTVEVNX1VTRVJ8VEFCTEVTP3xUQUJMRVNQQUNFfFRFTVAoPzpPUkFSWXxUQUJMRSk/fFRFUk1JTkFURUR8VEVYVCg/OlNJWkUpP3xUSEVOfFRJTUUoPzpTVEFNUCk/fFRJTlkoPzpCTE9CfElOVHxURVhUKXxUT1A/fFRSQU4oPzpTQUNUSU9OUz8pP3xUUklHR0VSfFRSVU5DQVRFfFRTRVFVQUx8VFlQRVM/fFVOQk9VTkRFRHxVTkNPTU1JVFRFRHxVTkRFRklORUR8VU5JT058VU5JUVVFfFVOTE9DS3xVTlBJVk9UfFVOU0lHTkVEfFVQREFURSg/OlRFWFQpP3xVU0FHRXxVU0V8VVNFUnxVU0lOR3xWQUxVRVM/fFZBUig/OkJJTkFSWXxDSEFSfENIQVJBQ1RFUnxZSU5HKXxWSUVXfFdBSVRGT1J8V0FSTklOR1N8V0hFTnxXSEVSRXxXSElMRXxXSVRIKD86IFJPTExVUHxJTik/fFdPUkt8V1JJVEUoPzpURVhUKT98WUVBUilcXGIvaSxcbiAgICBib29sZWFuOiAvXFxiKD86RkFMU0V8TlVMTHxUUlVFKVxcYi9pLFxuICAgIG51bWJlcjogL1xcYjB4W1xcZGEtZl0rXFxifFxcYlxcZCsoPzpcXC5cXGQqKT98XFxCXFwuXFxkK1xcYi9pLFxuICAgIG9wZXJhdG9yOlxuICAgICAgL1stKypcXC89JV5+XXwmJj98XFx8XFx8P3whPT98PCg/Oj0+P3w8fD4pP3w+Wz49XT98XFxiKD86QU5EfEJFVFdFRU58RElWfElMSUtFfElOfElTfExJS0V8Tk9UfE9SfFJFR0VYUHxSTElLRXxTT1VORFMgTElLRXxYT1IpXFxiL2ksXG4gICAgcHVuY3R1YXRpb246IC9bO1tcXF0oKWAsLl0vXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./node_modules/refractor/lang/sql.js\n"));

/***/ })

}]);