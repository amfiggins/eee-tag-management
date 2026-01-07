# PDF and Word Document Generation Guide

This document explains how to automatically generate PDF and Word (.docx) versions of the TAG_DEPLOYMENT_GUIDE.md file.

## Quick Start (Fully Automated - No User Interaction Required)

**Simply run:**
```bash
python3 convert_to_pdf_word.py
```

This will automatically:
1. Generate `TAG_DEPLOYMENT_GUIDE.docx` (Word document)
2. Generate `TAG_DEPLOYMENT_GUIDE.pdf` (PDF document)
3. Remove old versions before creating new ones

**That's it!** Both files are ready to share with your team immediately.

## When to Update the Documents

**Always update when:**
- The TAG_DEPLOYMENT_GUIDE.md file is edited
- New tags are added
- Troubleshooting steps are updated
- Any content changes are made

**Process:**
1. Edit `TAG_DEPLOYMENT_GUIDE.md` as needed
2. Run `python3 convert_to_pdf_word.py`
3. The script automatically removes old files and creates new ones
4. Share the generated PDF or Word document with your team

## Files

- `TAG_DEPLOYMENT_GUIDE.md` - Source Markdown file (edit this)
- `TAG_DEPLOYMENT_GUIDE.docx` - Generated Word document (auto-generated, ready to use)
- `TAG_DEPLOYMENT_GUIDE.pdf` - Generated PDF document (auto-generated, ready to use)
- `convert_to_pdf_word.py` - Automated conversion script

## Requirements

The script will automatically install required Python packages on first run:
- `python-docx` - For Word document generation
- `markdown` - For Markdown parsing
- `playwright` - For PDF generation (requires browser installation)

**First-time setup:** On first run, Playwright will download a browser (~160MB). This only happens once.

## Troubleshooting

**Script won't run:**
- Make sure Python 3 is installed: `python3 --version`
- The script will automatically install required packages

**PDF creation fails:**
- On first run, Playwright needs to download browsers (~160MB)
- If it fails, manually run: `python3 -m playwright install chromium`
- Wait for the download to complete, then run the script again

**Word document issues:**
- The Word document should work in Microsoft Word, Google Docs, and LibreOffice
- If formatting looks off, it's likely a viewer issue - the content is correct

**Both files fail:**
- Check that you have write permissions in the docs/ folder
- Make sure TAG_DEPLOYMENT_GUIDE.md exists
- Check for error messages in the script output

## Notes

- The script automatically removes old PDF and Word files before creating new ones
- Both documents are fully formatted and ready to share
- No manual steps or user interaction required - completely automated
- PDF uses professional styling optimized for printing
- Word document preserves formatting and structure
