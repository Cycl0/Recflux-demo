"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/page",{

/***/ "(app-pages-browser)/./app/page.tsx":
/*!**********************!*\
  !*** ./app/page.tsx ***!
  \**********************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": function() { return /* binding */ Home; }\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _components_InputBox__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/InputBox */ \"(app-pages-browser)/./app/components/InputBox.tsx\");\n/* harmony import */ var _components_CodeSection__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/CodeSection */ \"(app-pages-browser)/./app/components/CodeSection.tsx\");\n/* harmony import */ var _components_VideoBackground__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/VideoBackground */ \"(app-pages-browser)/./app/components/VideoBackground.tsx\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_4__);\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\nfunction Home() {\n    _s();\n    const [index, setIndex] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(-1);\n    function nextImageHandler() {\n        setIndex((prevIndex)=>prevIndex + 1);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"main\", {\n        className: \"p-36\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react__WEBPACK_IMPORTED_MODULE_4__.Suspense, {\n                fallback: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                    children: \"Loading video...\"\n                }, void 0, false, {\n                    fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                    lineNumber: 17,\n                    columnNumber: 27\n                }, void 0),\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_VideoBackground__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {}, void 0, false, {\n                    fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                    lineNumber: 18,\n                    columnNumber: 9\n                }, this)\n            }, void 0, false, {\n                fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                lineNumber: 17,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                id: \"content\",\n                className: \"flex min-h-screen flex-col items-center justify-between p-12 backdrop-blur-xl opacity-[99%] shadow-gradient-2 rounded-md\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_InputBox__WEBPACK_IMPORTED_MODULE_1__[\"default\"], {\n                        nextImageHandler: nextImageHandler\n                    }, void 0, false, {\n                        fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                        lineNumber: 21,\n                        columnNumber: 9\n                    }, this),\n                    index > -1 && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_CodeSection__WEBPACK_IMPORTED_MODULE_2__[\"default\"], {\n                        index: index\n                    }, void 0, false, {\n                        fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                        lineNumber: 22,\n                        columnNumber: 27\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n                lineNumber: 20,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"/home/runner/Recflux-demo/app/page.tsx\",\n        lineNumber: 16,\n        columnNumber: 5\n    }, this);\n}\n_s(Home, \"2JAv0Na7iCnml2ia58x/maqis+c=\");\n_c = Home;\nvar _c;\n$RefreshReg$(_c, \"Home\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC9wYWdlLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFFNkM7QUFDTTtBQUNRO0FBQ2hCO0FBRTVCLFNBQVNLOztJQUN0QixNQUFNLENBQUNDLE9BQU9DLFNBQVMsR0FBR0osK0NBQVFBLENBQUMsQ0FBQztJQUVwQyxTQUFTSztRQUNQRCxTQUFTLENBQUNFLFlBQWNBLFlBQVk7SUFDdEM7SUFFQSxxQkFDRSw4REFBQ0M7UUFBS0MsV0FBVTs7MEJBQ2QsOERBQUNQLDJDQUFRQTtnQkFBQ1Esd0JBQVUsOERBQUNDOzhCQUFFOzs7Ozs7MEJBQ3JCLDRFQUFDWCxtRUFBZUE7Ozs7Ozs7Ozs7MEJBRWxCLDhEQUFDWTtnQkFBSUMsSUFBRztnQkFBVUosV0FBWTs7a0NBQzVCLDhEQUFDWCw0REFBUUE7d0JBQUNRLGtCQUFrQkE7Ozs7OztvQkFDMUJGLFFBQVMsQ0FBQyxtQkFBTSw4REFBQ0wsK0RBQVdBO3dCQUFDSyxPQUFPQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSTlDO0dBbEJ3QkQ7S0FBQUEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vYXBwL3BhZ2UudHN4Pzc2MDMiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2UgY2xpZW50XCI7XG5cbmltcG9ydCBJbnB1dEJveCBmcm9tIFwiQC9jb21wb25lbnRzL0lucHV0Qm94XCI7XG5pbXBvcnQgQ29kZVNlY3Rpb24gZnJvbSBcIkAvY29tcG9uZW50cy9Db2RlU2VjdGlvblwiO1xuaW1wb3J0IFZpZGVvQmFja2dyb3VuZCBmcm9tICdAL2NvbXBvbmVudHMvVmlkZW9CYWNrZ3JvdW5kJztcbmltcG9ydCB7IHVzZVN0YXRlLCBTdXNwZW5zZSB9IGZyb20gXCJyZWFjdFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBIb21lKCkge1xuICBjb25zdCBbaW5kZXgsIHNldEluZGV4XSA9IHVzZVN0YXRlKC0xKTtcblxuICBmdW5jdGlvbiBuZXh0SW1hZ2VIYW5kbGVyKCkge1xuICAgIHNldEluZGV4KChwcmV2SW5kZXgpID0+IHByZXZJbmRleCArIDEpO1xuICB9XG4gIFxuICByZXR1cm4gKFxuICAgIDxtYWluIGNsYXNzTmFtZT1cInAtMzZcIj5cbiAgICAgIDxTdXNwZW5zZSBmYWxsYmFjaz17PHA+TG9hZGluZyB2aWRlby4uLjwvcD59PlxuICAgICAgICA8VmlkZW9CYWNrZ3JvdW5kIC8+XG4gICAgICA8L1N1c3BlbnNlPlxuICAgICAgPGRpdiBpZD1cImNvbnRlbnRcIiBjbGFzc05hbWU9e2BmbGV4IG1pbi1oLXNjcmVlbiBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHAtMTIgYmFja2Ryb3AtYmx1ci14bCBvcGFjaXR5LVs5OSVdIHNoYWRvdy1ncmFkaWVudC0yIHJvdW5kZWQtbWRgfT5cbiAgICAgICAgPElucHV0Qm94IG5leHRJbWFnZUhhbmRsZXI9e25leHRJbWFnZUhhbmRsZXJ9IC8+XG4gICAgICAgIHsoaW5kZXggPiAgLTEpICYmIDxDb2RlU2VjdGlvbiBpbmRleD17aW5kZXh9IC8+fVxuICAgICAgPC9kaXY+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sIm5hbWVzIjpbIklucHV0Qm94IiwiQ29kZVNlY3Rpb24iLCJWaWRlb0JhY2tncm91bmQiLCJ1c2VTdGF0ZSIsIlN1c3BlbnNlIiwiSG9tZSIsImluZGV4Iiwic2V0SW5kZXgiLCJuZXh0SW1hZ2VIYW5kbGVyIiwicHJldkluZGV4IiwibWFpbiIsImNsYXNzTmFtZSIsImZhbGxiYWNrIiwicCIsImRpdiIsImlkIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/page.tsx\n"));

/***/ })

});