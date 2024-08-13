const someJSCodeExample = `
/*

Ex:

"use client";

import { useState } from "react";
import InputBox from "@/components/InputBox";
import GeneratedSection from "@/components/GeneratedSection";
import VideoBackground from '@/components/VideoBackground';

export default function Home() {
  const [index, setIndex] = useState(-1);

  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  }
  
  return (
    <main className="p-36">
      <VideoBackground />
      <div id="content" className={\`min-h-screen items-center justify-between p-12 backdrop-blur-xl opacity-[99%] shadow-gradient-2 rounded-md\`}>
        <InputBox nextImageHandler={nextImageHandler} />
        
        {(index >  -1) && <GeneratedSection index={index} />}
      </div>
    </main>
  );
}

*/
`;

const someCSSCodeExample = `
/*

Ex:

@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  outline: none;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
*::-webkit-scrollbar {
  display: none;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[type=reset], [type=submit], button, html [type=button] {
    -webkit-appearance: button;
}

[type=button]{
  -webkit-appearance: none;
}

.full-width {
  width: 100%;
}
.full-height {
  height: 100%;
}
.full-size {
  width: 100%;
  height: 100%;
}

.ql-editor a {
  color: rgba(255, 255, 255, 0.20);
  cursor: pointer;
  padding-left: 8px;
  padding-right: 8px;
  text-decoration: none;
}
.ql-editor ul, .ql-editor li, .ql-editor ol {
  margin-left: 16px;
}
.ql-editor object {
  color: #d32f2f;
}
.ql-editor blockquote {
  border-left: 3px solid rgba(255, 255, 255, 0.12);
  padding-top: 8px;
  padding-left: 24px;
  padding-right: 16px;
  padding-bottom: 8px;
}
.ql-editor .ql-align-center {
  text-align: center;
}
.ql-editor .ql-align-justify {
  text-align: justify;
}
.ql-editor .ql-align-right {
  text-align: right;
}
.ql-editor a:hover {
  text-decoration: underline;
}

*/
`;

const someHTMLCodeExample = `
<!--

Ex:

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <link rel="preconnect" href="https://storage.googleapis.com">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#111" />

    <meta
      name="description"
      content="Wlist"
      data-react-helmet="true"
    />
    <meta
      property="og:title"
      content="Wlist"
      data-react-helmet="true"
    >
    <meta
      property="og:description"
      content="Wlist"
      data-react-helmet="true"
    >
    <meta
      property="og:url"
      content="%PUBLIC_URL%"
      data-react-helmet="true"
    >
    <meta
      property="og:image"
      content="%PUBLIC_URL%/images/cover.png"
      data-react-helmet="true"
    />
    <meta
      name="twitter:card"
      content="summary"
      data-react-helmet="true"
    />
    <meta property="og:type" content="website" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" crossorigin="use-credentials" />
    <link rel="preload" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">

    <title>Wlist</title>

    <script type="text/javascript">
      var ua = navigator.userAgent;
      var is_ie = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

      if (is_ie) {
        document.ie = 'true';

        var ie_script = document.createElement('script');
        var ie_styles = document.createElement('link');

        ie_script.src = 'no-ie/init.js';
        ie_styles.rel = 'stylesheet';
        ie_styles.href = 'no-ie/styles.css';

        function injectScripts() {
          document.body.innerHTML = '';
          document.body.appendChild(ie_styles);
          document.body.appendChild(ie_script);
        }

        if (document.addEventListener) {
          document.addEventListener('DOMContentLoaded', injectScripts);
        } else { // before IE 9
          document.attachEvent('DOMContentLoaded', injectScripts);
        }

      }
    </script>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <script type="text/javascript">
      // set the body color before app initialization, to avoid blinking
      var themeMode = localStorage.getItem('theme-mode');
      var initialBodyStyles = document.createElement('style');
      var currentThemeColor = themeMode === 'light' ? '#fafafa': '#111';
      initialBodyStyles.innerText = 'body { background-color: ' + currentThemeColor + ' }';
      document.head.appendChild(initialBodyStyles);

      // also set meta[name="theme-color"] content
      var metaTheme = document.querySelector('meta[name="theme-color"]');

      metaTheme.content = currentThemeColor;
    </script>
    <div id="root"></div>
  </body>
</html>

-->
`;

const someSvgExample = `
<!--
Ex:

<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>
<svg id="sw-js-blob-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sw-gradient" x1="0" x2="1" y1="1" y2="0">
      <stop id="stop1" stop-color="rgba(248, 117, 55, 1)" offset="0%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #a93a06;"></stop>
      <stop id="stop2" stop-color="rgba(255, 82.151, 82.151, 1)" offset="100%" data-darkreader-inline-stopcolor="" style="--darkreader-inline-stopcolor: #9b0000;"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#sw-gradient)" d="M14.9,-23.6C21,-22.3,28.8,-21.7,33.8,-17.9C38.8,-14.1,40.9,-7,41.3,0.2C41.7,7.5,40.4,15,33.9,16.2C27.4,17.4,15.7,12.2,9.2,11.7C2.7,11.3,1.4,15.5,-0.5,16.3C-2.4,17.2,-4.7,14.7,-10.3,14.7C-16,14.7,-24.8,17.1,-24.4,15C-23.9,13,-14.1,6.5,-15.6,-0.9C-17.1,-8.2,-30,-16.5,-29.9,-17.5C-29.8,-18.6,-16.7,-12.4,-9.6,-13.2C-2.4,-13.9,-1.2,-21.5,1.6,-24.2C4.4,-27,8.8,-24.9,14.9,-23.6Z" width="100%" height="100%" transform="translate(50 50)" stroke-width="0" style="transition: all 0.3s ease 0s;"></path>
</svg>

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
  }
};

export default files;
