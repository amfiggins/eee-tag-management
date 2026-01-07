#!/usr/bin/env python3
"""
Convert TAG_DEPLOYMENT_GUIDE.md to PDF

This script converts the Markdown deployment guide to an HTML file that can be
easily printed to PDF from any browser. The HTML is styled for optimal PDF printing.

Usage:
    python3 convert_to_pdf.py
    
After running, open TAG_DEPLOYMENT_GUIDE.html in your browser and:
    - Mac: Cmd+P → Save as PDF
    - Windows: Ctrl+P → Save as PDF
    - Or use the "Print to PDF" option
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    try:
        import markdown
        return True
    except ImportError:
        return False

def install_dependencies():
    """Install required packages"""
    print("Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown", "--quiet"])
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("✗ Failed to install dependencies")
        return False

def convert_markdown_to_html(md_file, html_file):
    """Convert markdown file to styled HTML"""
    # Import markdown
    try:
        import markdown
    except ImportError:
        print("Required packages not found. Installing...")
        if not install_dependencies():
            print("Please install manually: pip install markdown")
            return False
        import markdown
    
    # Read markdown file
    print(f"Reading {md_file}...")
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML
    print("Converting markdown to HTML...")
    md = markdown.Markdown(extensions=['extra', 'codehilite', 'tables', 'toc'])
    html_content = md.convert(md_content)
    
    # Add CSS styling optimized for PDF printing
    css_style = """
    <style>
        @media print {
            @page {
                size: letter;
                margin: 0.75in;
            }
            body {
                font-size: 10pt;
            }
            h1 {
                page-break-after: avoid;
            }
            h2, h3 {
                page-break-after: avoid;
            }
            pre, code {
                page-break-inside: avoid;
            }
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        
        h1 {
            font-size: 28pt;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 15px;
            margin-top: 0;
            margin-bottom: 25px;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 22pt;
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 18pt;
            color: #34495e;
            margin-top: 25px;
            margin-bottom: 12px;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 14pt;
            color: #34495e;
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        p {
            margin: 10px 0;
            text-align: justify;
        }
        
        code {
            background-color: #f4f4f4;
            padding: 3px 6px;
            border-radius: 3px;
            font-family: "Courier New", "Monaco", "Consolas", monospace;
            font-size: 10pt;
            color: #e83e8c;
        }
        
        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-left: 4px solid #3498db;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            font-size: 10pt;
            line-height: 1.4;
            page-break-inside: avoid;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
            color: #333;
            border: none;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 35px;
        }
        
        li {
            margin: 8px 0;
        }
        
        ul li {
            list-style-type: disc;
        }
        
        ol li {
            list-style-type: decimal;
        }
        
        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 20px 0;
            color: #555;
            font-style: italic;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            color: #2c3e50;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        strong {
            color: #2c3e50;
            font-weight: 600;
        }
        
        em {
            font-style: italic;
        }
        
        a {
            color: #3498db;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        
        .toc {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .toc li {
            margin: 5px 0;
        }
        
        .toc a {
            color: #495057;
            text-decoration: none;
        }
        
        .toc a:hover {
            color: #3498db;
            text-decoration: underline;
        }
        
        /* Print instructions banner */
        .print-instructions {
            background-color: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 30px;
            font-size: 12pt;
        }
        
        .print-instructions strong {
            color: #856404;
            display: block;
            margin-bottom: 8px;
        }
        
        .print-instructions code {
            background-color: #fff;
            padding: 2px 6px;
        }
        
        @media print {
            .print-instructions {
                display: none;
            }
        }
    </style>
    """
    
    # Create full HTML document
    full_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>3E Tag Manager Deployment Guide</title>
        {css_style}
    </head>
    <body>
        <div class="print-instructions">
            <strong>📄 To Create PDF:</strong>
            <ul style="margin: 8px 0; padding-left: 25px;">
                <li><strong>Mac:</strong> Press <code>Cmd+P</code> → Click "Save as PDF"</li>
                <li><strong>Windows:</strong> Press <code>Ctrl+P</code> → Select "Save as PDF" or "Microsoft Print to PDF"</li>
                <li><strong>Chrome/Edge:</strong> Press <code>Ctrl+P</code> or <code>Cmd+P</code> → Destination: "Save as PDF"</li>
            </ul>
            <p style="margin: 8px 0 0 0; font-size: 10pt; color: #856404;">
                This banner will not appear in the printed PDF.
            </p>
        </div>
        {html_content}
    </body>
    </html>
    """
    
    # Write HTML file
    print("Creating HTML file...")
    try:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(full_html)
        print(f"✓ HTML file created successfully: {html_file}")
        return True
    except Exception as e:
        print(f"✗ Error creating HTML file: {e}")
        return False

def main():
    # Get script directory
    script_dir = Path(__file__).parent
    md_file = script_dir / "TAG_DEPLOYMENT_GUIDE.md"
    html_file = script_dir / "TAG_DEPLOYMENT_GUIDE.html"
    pdf_file = script_dir / "TAG_DEPLOYMENT_GUIDE.pdf"
    
    # Check if markdown file exists
    if not md_file.exists():
        print(f"Error: {md_file} not found")
        sys.exit(1)
    
    # Remove old files if they exist
    if html_file.exists():
        print(f"Removing old HTML: {html_file}")
        html_file.unlink()
    
    if pdf_file.exists():
        print(f"Removing old PDF: {pdf_file}")
        pdf_file.unlink()
    
    # Convert to HTML
    print(f"\nConverting {md_file.name} to HTML...\n")
    success = convert_markdown_to_html(md_file, html_file)
    
    if success:
        file_size = html_file.stat().st_size / 1024  # Size in KB
        print(f"\n✓ Conversion complete!")
        print(f"  HTML file: {html_file}")
        print(f"  File size: {file_size:.1f} KB")
        print(f"\n📄 To create PDF:")
        print(f"  1. Open {html_file.name} in your web browser")
        print(f"  2. Press Cmd+P (Mac) or Ctrl+P (Windows)")
        print(f"  3. Select 'Save as PDF' as the destination")
        print(f"  4. Save as TAG_DEPLOYMENT_GUIDE.pdf")
    else:
        print("\n✗ Conversion failed. See errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
