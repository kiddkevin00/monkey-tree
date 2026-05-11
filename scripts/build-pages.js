const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'public');
const outputDir = path.join(rootDir, 'dist');

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function injectStaticSubscribeFlag(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const flagScript = [
    '<script>',
    '  window.MONKEY_TREE_DISABLE_SUBSCRIBE = true;',
    '</script>',
    '',
  ].join('\n');

  if (!html.includes('MONKEY_TREE_DISABLE_SUBSCRIBE')) {
    html = html.replace(
      '<script src="assets/js/custom.js"></script>',
      `${flagScript}  <script src="assets/js/custom.js"></script>`
    );
  }

  fs.writeFileSync(filePath, html);
}

function rewriteRootRelativeLinks(filePath, pageNames) {
  let html = fs.readFileSync(filePath, 'utf8');

  function rewriteAttribute(match, attribute, url, hash) {
    let nextUrl = url;

    if (attribute === 'href') {
      const pageName = url.replace(/\/$/, '');

      if (pageNames.has(pageName)) {
        nextUrl = pageName === 'home' ? 'index.html' : `${pageName}.html`;
      }
    }

    return `${attribute}="${nextUrl}${hash || ''}"`;
  }

  html = html
    .replace(/\b(href|src|action)="\/(?!\/)([^"#?:]+)(#[^"]*)?"/g, rewriteAttribute)
    .replace(/\bhref="([^/"#?:]+)(#[^"]*)?"/g, (match, url, hash) => {
      if (pageNames.has(url)) {
        return `href="${url === 'home' ? 'index.html' : `${url}.html`}${hash || ''}"`;
      }

      return match;
    })
    .replace(/\bdata-bg="\/(?!\/)([^"]+)"/g, 'data-bg="$1"')
    .replace(/\bdata-image="\/(?!\/)([^"]+)"/g, 'data-image="$1"');

  fs.writeFileSync(filePath, html);
}

function rewriteSitemapLinks(filePath, pageNames) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let xml = fs.readFileSync(filePath, 'utf8');

  xml = xml.replace(/(<loc>https?:\/\/[^/]+\/)([^<./?#]+)(<\/loc>)/g, (match, prefix, pageName, suffix) => {
    if (!pageNames.has(pageName)) {
      return match;
    }

    return `${prefix}${pageName === 'home' ? 'index' : pageName}.html${suffix}`;
  });

  fs.writeFileSync(filePath, xml);
}

function validatePageLinks(pageNames) {
  const problems = [];
  const externalPattern = /^(?:https?:|mailto:|tel:|javascript:)/;
  const hrefPattern = /<a\b[^>]*\bhref="([^"]*)"/g;

  for (const entry of fs.readdirSync(outputDir)) {
    if (!entry.endsWith('.html')) {
      continue;
    }

    const html = fs.readFileSync(path.join(outputDir, entry), 'utf8');
    let match;

    while ((match = hrefPattern.exec(html))) {
      const href = match[1];

      if (!href || href.startsWith('#') || externalPattern.test(href) || href.startsWith('assets/')) {
        continue;
      }

      const pageName = href
        .split('#')[0]
        .split('?')[0]
        .replace(/^\//, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '');

      if (pageNames.has(pageName) && !href.includes('.html')) {
        problems.push(`${entry}: ${href}`);
      }
    }
  }

  if (problems.length) {
    throw new Error(`Extensionless internal page links found:\n${problems.join('\n')}`);
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
copyDirectory(sourceDir, outputDir);

fs.copyFileSync(path.join(sourceDir, 'home.html'), path.join(outputDir, 'index.html'));
fs.copyFileSync(path.join(sourceDir, 'home.html'), path.join(outputDir, '404.html'));
fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');

for (const page of ['home.html', 'contact.html', 'index.html', '404.html']) {
  injectStaticSubscribeFlag(path.join(outputDir, page));
}

const pageNames = new Set(
  fs.readdirSync(outputDir)
    .filter(entry => entry.endsWith('.html'))
    .map(entry => entry.replace(/\.html$/, ''))
);

for (const entry of fs.readdirSync(outputDir)) {
  if (entry.endsWith('.html')) {
    rewriteRootRelativeLinks(path.join(outputDir, entry), pageNames);
  }
}

rewriteSitemapLinks(path.join(outputDir, 'sitemap.xml'), pageNames);
validatePageLinks(pageNames);

console.log(`GitHub Pages site built at ${outputDir}`);
