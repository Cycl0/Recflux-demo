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

const files = {
  "index.html": {
    name: "index.html",
    language: "html",
    value: someHTMLCodeExample
  },
  "style.css": {
    name: "style.css",
    language: "css",
    value: someCSSCodeExample
  },
  "script.js": {
    name: "script.js",
    language: "javascript",
    value: someJSCodeExample
  },
  "image.svg": {
    name: "image.svg",
    language: "xml",
    value: someSvgExample
  },
  "commentary": {
    name: "commentary",
    language: "",
    value: "",
  }
};

export default files;
