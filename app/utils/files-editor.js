const someJSCodeExample = `
/*
Código Javascript relevante ao prompt
*/
`;

const someCSSCodeExample = `
/*
Código CSS relevante ao prompt
*/
`;

const someHTMLCodeExample = `
<!--
Código HTML relevante ao prompt
-->
`;

const someSvgExample = `
<!--
Código SVG relevante ao prompt
-->
`;

export const initialFiles = {
  "index.html": {
    name: "index.html",
    language: "html",
    value: someHTMLCodeExample,
    desc: ""
  },
  "style.css": {
    name: "style.css",
    language: "css",
    value: someCSSCodeExample,
    desc: ""
  },
  "script.js": {
    name: "script.js",
    language: "javascript",
    value: someJSCodeExample,
    desc: ""
  },
  "image.svg": {
    name: "image.svg",
    language: "xml",
    value: someSvgExample,
    desc: ""
  }
};

export const emptyFiles = {
  "index.html": {
    name: "index.html",
    language: "html",
    value: "",
    desc: ""
  },
  "style.css": {
    name: "style.css",
    language: "css",
    value: "",
    desc: ""
  },
  "script.js": {
    name: "script.js",
    language: "javascript",
    value: "",
    desc: ""
  },
  "image.svg": {
    name: "image.svg",
    language: "xml",
    value: "",
    desc: ""
  }
};


export default {emptyFiles, initialFiles};
