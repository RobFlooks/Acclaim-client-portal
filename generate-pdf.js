import fs from 'fs';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

async function generatePDF() {
  try {
    // Read the markdown file
    const markdown = fs.readFileSync('AZURE_MIGRATION_GUIDE.md', 'utf8');
    
    // Convert markdown to HTML
    const html = marked(markdown);
    
    // Create full HTML document with styling
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Azure Migration Guide - Acclaim Credit Management System</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                line-height: 1.6;
                color: #333;
            }
            h1 { color: #0078d4; border-bottom: 3px solid #0078d4; padding-bottom: 10px; }
            h2 { color: #106ebe; margin-top: 30px; }
            h3 { color: #323130; }
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
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 5px; }
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
            .cost-highlight {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
            }
            .security-checklist {
                background-color: #d1ecf1;
                border-left: 4px solid #17a2b8;
                padding: 15px;
                margin: 20px 0;
            }
            @media print {
                body { font-size: 12px; }
                h1 { page-break-before: always; }
                h1:first-of-type { page-break-before: auto; }
                pre, code { font-size: 10px; }
            }
        </style>
    </head>
    <body>
        ${html}
    </body>
    </html>
    `;
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: 'AZURE_MIGRATION_GUIDE.pdf',
      format: 'A4',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#666;">Azure Migration Guide - Acclaim Credit Management System</div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    });
    
    await browser.close();
    console.log('PDF generated successfully: AZURE_MIGRATION_GUIDE.pdf');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

generatePDF();