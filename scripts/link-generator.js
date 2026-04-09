// This script generates links for the documentation files in the AirWatch Bologna project.

const fs = require('fs');
const path = require('path');

// Define the directory containing the markdown files
const docsDir = path.join(__dirname, '../docs');

// Function to generate links for markdown files
function generateLinks() {
    const files = fs.readdirSync(docsDir);
    let links = '';

    files.forEach(file => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            const subFiles = fs.readdirSync(filePath);
            subFiles.forEach(subFile => {
                const subFilePath = path.join(filePath, subFile);
                const subStats = fs.statSync(subFilePath);
                if (subStats.isFile() && subFile.endsWith('.md')) {
                    const link = `[${subFile.replace('.md', '')}](${path.relative(docsDir, subFilePath)})`;
                    links += `${link}\n`;
                }
            });
        } else if (file.endsWith('.md')) {
            const link = `[${file.replace('.md', '')}](${path.relative(docsDir, filePath)})`;
            links += `${link}\n`;
        }
    });

    return links;
}

// Write the generated links to a new file
const outputFilePath = path.join(docsDir, 'links.md');
fs.writeFileSync(outputFilePath, generateLinks(), 'utf8');

console.log('Links generated successfully!');