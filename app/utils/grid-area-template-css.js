// grid template css
const gtc = (name) => (
  `grid grid-areas-${name}Layout grid-cols-${name}Layout grid-rows-${name}Layout`
);

// grid template css w/ media query
const gtcm = (name, mediaQuery) => (
  `grid ${mediaQuery}:grid-areas-${name}Layout ${mediaQuery}:grid-cols-${name}Layout ${mediaQuery}:grid-rows-${name}Layout`
);

export {gtc, gtcm};
