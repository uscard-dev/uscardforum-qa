import { readFileSync } from 'fs';
import { build, context } from 'esbuild';

const banner = readFileSync('./banner.js', 'utf-8');
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/uscardforum-qa.user.js',
  banner: { js: banner },
  minify: false,
  sourcemap: isWatch ? 'inline' : false,
  define: {
    'process.env.GOOGLE_GENERATIVE_AI_API_KEY': 'undefined',
    'process.env.NODE_ENV': '"production"',
  },
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await build(buildOptions);
  console.log('Build complete: dist/uscardforum-qa.user.js');
}
