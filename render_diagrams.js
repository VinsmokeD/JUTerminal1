const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'docs/final-report/diagrams/source';
const SVG_DIR = 'docs/final-report/diagrams/export/svg';
const PNG_DIR = 'docs/final-report/diagrams/export/png';
const THEME = 'docs/final-report/diagrams/mermaid-theme.json';

if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true });
if (!fs.existsSync(PNG_DIR)) fs.mkdirSync(PNG_DIR, { recursive: true });

const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.mmd'));

files.forEach(file => {
    const name = path.parse(file).name;
    const input = path.join(SOURCE_DIR, file);
    const svgOutput = path.join(SVG_DIR, `${name}.svg`);
    const pngOutput = path.join(PNG_DIR, `${name}.png`);

    console.log(`Rendering ${name}...`);
    try {
        execSync(`npx --yes @mermaid-js/mermaid-cli -c ${THEME} -i "${input}" -o "${svgOutput}" -b white`, { stdio: 'inherit' });
        execSync(`npx --yes @mermaid-js/mermaid-cli -c ${THEME} -i "${input}" -o "${pngOutput}" -b white -s 2`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed to render ${name}:`, err.message);
    }
});
