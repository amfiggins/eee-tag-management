/**
 * GTM Tag Info API Route
 * Gets tag information from the tags folder (version, content, category)
 * 
 * Author: Anthony Figgins
 * Version: 1.1.0
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { extractVersion } from '@/utils/version-detector';

function getTagCategory(tagName: string): string {
  // Map tag names to their solution folders (new structure)
  const categoryMap: Record<string, string> = {
    // Base Solutions
    'Template - 3E Config': 'base-solutions',
    '3E_Analytics Tracking': 'base-solutions',
    '3E_Page Activity': 'base-solutions',
    '3E_Form Validation': 'base-solutions',
    '3E_RFI Submit': 'base-solutions',
    '3E_Favicon Injection': 'base-solutions',
    '3E_Sticky Buttons': 'base-solutions',
    '3E_Cloudflare Beacon': 'base-solutions',
    // Chatbot Solutions
    '3E_3EI Recruiter Activity': 'chatbot-solutions',
    '3E_3EI Recruiter Conversion': 'chatbot-solutions',
    '3E_3EI Recruiter Tracking': 'chatbot-solutions',
    '3E_3EI Recruiter Unified': 'chatbot-solutions',
    '3E_Insights Pixel': 'chatbot-solutions',
    // Pop-up Solutions
    '3E_Pop-up': 'pop-up-solutions',
    '3E_Pop-up Marketo Form': 'pop-up-solutions',
    '3E_Pop-up Tracking': 'pop-up-solutions',
  };
  
  return categoryMap[tagName] || 'base-solutions';
}

/**
 * Get tag information from the tags folder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagName } = body;

    if (!tagName) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tag name is required' 
        },
        { status: 400 }
      );
    }

    // Get tags directory
    const tagsDir = join(process.cwd(), '..', 'tags');
    const category = getTagCategory(tagName);
    
    // Try to find the tag file with fuzzy matching
    // 1. Try exact match
    // 2. Try with .js extension
    // 3. Try without .js extension (if tagName has .js)
    // 4. Try partial match (e.g., "3E_3EI Recruiter" matches "3E_3EI Recruiter Unified")
    
    const normalizedTagName = tagName.replace(/\.js$/, ''); // Remove .js if present
    
    // Try exact match first
    let tagFilePath = join(tagsDir, category, tagName);
    let foundFileName = tagName;
    
    try {
      await readFile(tagFilePath, 'utf-8');
    } catch {
      // Try without .js extension
      try {
        tagFilePath = join(tagsDir, category, normalizedTagName);
        await readFile(tagFilePath, 'utf-8');
        foundFileName = normalizedTagName;
      } catch {
        // Try with .js extension
        try {
          tagFilePath = join(tagsDir, category, `${normalizedTagName}.js`);
          await readFile(tagFilePath, 'utf-8');
          foundFileName = `${normalizedTagName}.js`;
        } catch {
          // Try partial match - search all files in category
          try {
            const categoryPath = join(tagsDir, category);
            const files = await readdir(categoryPath);
            
            // Find files that start with the normalized tag name
            const matchingFile = files.find(file => {
              const fileWithoutExt = file.replace(/\.js$/, '');
              const tagWithoutExt = normalizedTagName;
              
              // Check if tag name is a prefix of file name or vice versa
              return fileWithoutExt.startsWith(tagWithoutExt) || 
                     tagWithoutExt.startsWith(fileWithoutExt) ||
                     fileWithoutExt === tagWithoutExt;
            });
            
            if (matchingFile) {
              tagFilePath = join(categoryPath, matchingFile);
              foundFileName = matchingFile;
            } else {
              throw new Error('Tag file not found');
            }
          } catch {
            // Last resort: try other categories
            const categories = ['base-solutions', 'chatbot-solutions', 'pop-up-solutions'];
            let found = false;
            
            for (const cat of categories) {
              try {
                const catPath = join(tagsDir, cat);
                const files = await readdir(catPath);
                
                const matchingFile = files.find(file => {
                  const fileWithoutExt = file.replace(/\.js$/, '');
                  const tagWithoutExt = normalizedTagName;
                  
                  return fileWithoutExt.startsWith(tagWithoutExt) || 
                         tagWithoutExt.startsWith(fileWithoutExt) ||
                         fileWithoutExt === tagWithoutExt;
                });
                
                if (matchingFile) {
                  tagFilePath = join(catPath, matchingFile);
                  foundFileName = matchingFile;
                  found = true;
                  break;
                }
              } catch {
                continue;
              }
            }
            
            if (!found) {
              throw new Error('Tag file not found in any category');
            }
          }
        }
      }
    }

    try {
      // Read tag file content
      const content = await readFile(tagFilePath, 'utf-8');
      
      // Extract version info
      const versionInfo = extractVersion(content);
      
      return NextResponse.json({
        success: true,
        tag: {
          name: foundFileName.replace(/\.js$/, ''), // Return name without .js
          category,
          version: versionInfo?.version || 'Unknown',
          dateUpdated: versionInfo?.dateUpdated || 'Unknown',
          description: versionInfo?.description,
          content, // Full tag content for updates
        },
      });
    } catch (fileError: any) {
      // File not found or can't be read
      return NextResponse.json(
        { 
          success: false,
          error: `Tag file not found: ${tagName}`,
          details: fileError.message
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Error getting tag info:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get tag info' 
      },
      { status: 500 }
    );
  }
}

