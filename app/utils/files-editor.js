const someJSCodeExample = `
function HelloWorld() {
  const [theme, setTheme] = useState('light');
  const [displayed, setDisplayed] = useState('');
  const message = "Hello, World! 🌍";

  // Animate the message letter by letter
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      setDisplayed(message.slice(0, i + 1));
      i++;
      if (i === message.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [message, theme]);

  // Theme styles
  const themes = {
    light: {
      background: '#f0f0f0',
      color: '#222',
      buttonBg: '#fff',
      buttonColor: '#222',
      border: '1px solid #ccc'
    },
    dark: {
      background: '#222',
      color: '#f0f0f0',
      buttonBg: '#333',
      buttonColor: '#f0f0f0',
      border: '1px solid #444'
    }
  };

  const style = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '100px',
    alignItems: 'center',
    justifyContent: 'start',
    background: themes[theme].background,
    color: themes[theme].color,
    transition: 'all 0.5s'
  };

  const buttonStyle = {
    marginTop: 30,
    padding: '10px 24px',
    fontSize: 18,
    borderRadius: 8,
    background: themes[theme].buttonBg,
    color: themes[theme].buttonColor,
    border: themes[theme].border,
    cursor: 'pointer',
    transition: 'all 0.3s'
  };

  return (
    <div style={style}>
      <h1 style={{
        fontSize: 48,
        letterSpacing: 2,
        marginBottom: 0,
        fontFamily: 'Segoe UI, Arial, sans-serif',
        textShadow: theme === 'dark' ? '0 2px 8px #000' : '0 2px 8px #aaa'
      }}>
        {displayed}
      </h1>
      <p style={{
        fontSize: 22,
        marginTop: 10,
        fontStyle: 'italic',
        opacity: 0.7
      }}>
        Welcome to your React app!
      </p>
      <button
        style={buttonStyle}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label="Toggle theme"
      >
        Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
      </button>
    </div>
  );
}

render(<HelloWorld />);
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
