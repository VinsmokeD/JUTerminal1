const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PNG_DIR = 'docs/final-report/diagrams/export/png';
const files = fs.readdirSync(PNG_DIR).filter(f => f.endsWith('.png'));

files.forEach(file => {
    // This is a bit tricky without a library, but I can use PowerShell's Identify-Image if available or just skip detailed dimensions for now and use generic values.
    // Actually, I can use a simple trick with file size or just use a placeholder.
    // Let's try to use powershell to get dimensions.
    const fullPath = path.resolve(path.join(PNG_DIR, file));
    try {
        const output = execSync(`powershell -NoProfile -Command "(Add-Type -AssemblyName System.Drawing; [System.Drawing.Image]::FromFile('${fullPath}')).Width; (Add-Type -AssemblyName System.Drawing; [System.Drawing.Image]::FromFile('${fullPath}')).Height"`, { encoding: 'utf8' });
        const [width, height] = output.trim().split(/\r?\n/);
        console.log(`| \`${file}\` | ${width} | ${height} |`);
    } catch (err) {
        console.log(`| \`${file}\` | ? | ? |`);
    }
});
