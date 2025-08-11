import { globby } from 'globby';
import { readFile, writeFile } from 'fs/promises';
import stripJs from 'strip-comments';
import stripCss from 'strip-css-comments';
import { minify as minifyHtml } from 'html-minifier-terser';

/**
 * Remove all JavaScript/JSX comments, including JSX comment nodes like {/* ... *\/}.
 */
async function processJsLike(filePath) {
  const original = await readFile(filePath, 'utf8');
  // Remove standard JS comments
  let stripped = stripJs(original);
  // Remove JSX comment nodes: {/* ... */}
  stripped = stripped.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  if (stripped !== original) {
    await writeFile(filePath, stripped, 'utf8');
    return true;
  }
  return false;
}

/**
 * Remove all CSS comments.
 */
async function processCssFile(filePath) {
  const original = await readFile(filePath, 'utf8');
  const stripped = stripCss(original, { preserve: false });
  if (stripped !== original) {
    await writeFile(filePath, stripped, 'utf8');
    return true;
  }
  return false;
}

/**
 * Remove HTML comments only; do not minify or change whitespace/layout.
 */
async function processHtmlFile(filePath) {
  const original = await readFile(filePath, 'utf8');
  const minified = await minifyHtml(original, {
    removeComments: true,
    collapseWhitespace: false,
    minifyCSS: false,
    minifyJS: false,
    keepClosingSlash: true,
    caseSensitive: true,
  });
  if (minified !== original) {
    await writeFile(filePath, minified, 'utf8');
    return true;
  }
  return false;
}

async function main() {
  const [jsFiles, cssFiles, htmlFiles] = await Promise.all([
    globby([
      'src/**/*.{js,jsx}',
      '*.config.js',
      '*.js'
    ], { gitignore: true }),
    globby(['src/**/*.css'], { gitignore: true }),
    globby(['index.html'], { gitignore: true }),
  ]);

  let changedCount = 0;

  await Promise.all(
    jsFiles.map(async (f) => {
      if (await processJsLike(f)) changedCount += 1;
    })
  );
  await Promise.all(
    cssFiles.map(async (f) => {
      if (await processCssFile(f)) changedCount += 1;
    })
  );
  await Promise.all(
    htmlFiles.map(async (f) => {
      if (await processHtmlFile(f)) changedCount += 1;
    })
  );

  // eslint-disable-next-line no-console
  console.log(`Comments removed in ${changedCount} file(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


