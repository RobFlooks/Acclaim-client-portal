import fs from 'fs';
import { marked } from 'marked';

// Simple HTML to PDF converter that creates a print-friendly HTML file
async function generatePrintableHTML() {
  try {
    // Read the markdown file
    const markdown = fs.readFileSync('AZURE_MIGRATION_GUIDE.md', 'utf8');
    
    // Convert markdown to HTML
    const html = marked(markdown);
    
    // Create full HTML document with print-optimized styling
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Azure Migration Guide - Acclaim Credit Management System</title>
        <style>
            @media print {
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 11pt;
                    line-height: 1.4;
                    color: #000;
                    margin: 0;
                    padding: 0;
                }
                
                h1 {
                    color: #0078d4 !important;
                    font-size: 18pt;
                    border-bottom: 2pt solid #0078d4;
                    padding-bottom: 8pt;
                    page-break-after: avoid;
                    margin-top: 0;
                }
                
                h2 {
                    color: #106ebe !important;
                    font-size: 14pt;
                    margin-top: 20pt;
                    margin-bottom: 8pt;
                    page-break-after: avoid;
                }
                
                h3 {
                    color: #323130 !important;
                    font-size: 12pt;
                    margin-top: 16pt;
                    margin-bottom: 6pt;
                    page-break-after: avoid;
                }
                
                pre, code {
                    font-family: 'Courier New', monospace;
                    font-size: 9pt;
                    background-color: #f8f8f8 !important;
                    border: 1pt solid #ddd;
                    padding: 6pt;
                    page-break-inside: avoid;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                
                pre {
                    margin: 8pt 0;
                    border-radius: 3pt;
                }
                
                ul, ol {
                    margin: 8pt 0;
                    padding-left: 16pt;
                }
                
                li {
                    margin-bottom: 3pt;
                    page-break-inside: avoid;
                }
                
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12pt 0;
                    page-break-inside: avoid;
                }
                
                th, td {
                    border: 1pt solid #333;
                    padding: 6pt;
                    text-align: left;
                    font-size: 10pt;
                }
                
                th {
                    background-color: #f0f0f0 !important;
                    font-weight: bold;
                }
                
                .page-break {
                    page-break-before: always;
                }
                
                @page {
                    margin: 2cm;
                    size: A4;
                    
                    @top-center {
                        content: "Azure Migration Guide - Acclaim Credit Management System";
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    @bottom-center {
                        content: "Page " counter(page) " of " counter(pages);
                        font-size: 9pt;
                        color: #666;
                    }
                }
            }
            
            @media screen {
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px 20px;
                    line-height: 1.6;
                    color: #333;
                    background-color: #fff;
                }
                
                h1 {
                    color: #0078d4;
                    border-bottom: 3px solid #0078d4;
                    padding-bottom: 10px;
                }
                
                h2 {
                    color: #106ebe;
                    margin-top: 30px;
                }
                
                h3 {
                    color: #323130;
                }
                
                code {
                    background-color: #f6f8fa;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Monaco', 'Menlo', monospace;
                }
                
                pre {
                    background-color: #f6f8fa;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    padding: 16px;
                    overflow-x: auto;
                }
                
                pre code {
                    background-color: transparent;
                    padding: 0;
                }
                
                ul, ol {
                    padding-left: 20px;
                }
                
                li {
                    margin-bottom: 5px;
                }
                
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px 12px;
                    text-align: left;
                }
                
                th {
                    background-color: #f6f8fa;
                    font-weight: 600;
                }
                
                .print-instructions {
                    background-color: #e7f3ff;
                    border-left: 4px solid #0078d4;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="print-instructions" style="display: block;">
            <h3>📄 How to Save as PDF:</h3>
            <ol>
                <li><strong>Press Ctrl+P</strong> (Cmd+P on Mac) to open the print dialog</li>
                <li><strong>Select "Save as PDF"</strong> as the destination</li>
                <li><strong>Choose "More settings"</strong> and ensure:
                    <ul>
                        <li>Paper size: A4</li>
                        <li>Margins: Default</li>
                        <li>Options: ✓ Background graphics</li>
                    </ul>
                </li>
                <li><strong>Click "Save"</strong> and choose your filename</li>
            </ol>
            <p><em>This guide is optimized for PDF printing with proper page breaks and styling.</em></p>
        </div>
        
        ${html}
    </body>
    </html>
    `;
    
    // Write the HTML file
    fs.writeFileSync('AZURE_MIGRATION_GUIDE_PRINTABLE.html', fullHtml);
    console.log('✅ Print-ready HTML file created: AZURE_MIGRATION_GUIDE_PRINTABLE.html');
    console.log('📖 Open this file in your browser and press Ctrl+P (Cmd+P on Mac) to save as PDF');
    
  } catch (error) {
    console.error('❌ Error generating HTML:', error);
  }
}

generatePrintableHTML();