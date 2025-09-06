const production = process.argv.includes("--production")

require('esbuild').build({
  entryPoints: ['./src/cline_cli/main.ts'],
  bundle: true,
  outfile: './dist/main.js',
  platform: 'node',
  external: ['vscode'],
  minify: production,
  sourcemap: !production,
  target: ['node21'],
}).catch(() => process.exit(1))
