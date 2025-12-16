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

// Map GTM tag names to repository file names (handles naming mismatches)
function getRepoTagName(gtmTagName: string): string {
  const tagNameMap: Record<string, string> = {
    // GTM tag name -> Repo file name
    '3E_3EI Recruiter': '3E_3EI Recruiter Unified', // GTM uses shorter name, repo has "Unified"
  };
  
  return tagNameMap[gtmTagName] || gtmTagName;
}

function getTagCategory(tagName: string): string {
  // Map tag names to their solution folders (new structure)
  // Use repo tag name for category lookup
  const repoTagName = getRepoTagName(tagName);
  
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
    '3E_3EI Recruiter': 'chatbot-solutions', // GTM name
    '3E_3EI Recruiter Unified': 'chatbot-solutions', // Repo name
    '3E_Insights Pixel': 'chatbot-solutions',
    // Pop-up Solutions
    '3E_Pop-up': 'pop-up-solutions',
    '3E_Pop-up Marketo Form': 'pop-up-solutions',
    '3E_Pop-up Tracking': 'pop-up-solutions',
  };
  
  // Try repo tag name first, then original tag name
  return categoryMap[repoTagName] || categoryMap[tagName] || 'base-solutions';
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
    
    // Get the repo tag name (handles naming mismatches like "3E_3EI Recruiter" -> "3E_3EI Recruiter Unified")
    const repoTagName = getRepoTagName(tagName);
    const category = getTagCategory(tagName);
    
    // Try to find the tag file with fuzzy matching
    // 1. Try exact match with repo tag name + .html
    // 2. Try exact match with original tag name + .html
    // 3. Try exact match without extension
    // 4. Try with .html extension (if not already present)
    // 5. Try partial match (e.g., "3E_3EI Recruiter" matches "3E_3EI Recruiter Unified")
    
    const normalizedRepoTagName = repoTagName.replace(/\.(js|html)$/, ''); // Remove .js or .html if present
    const normalizedTagName = tagName.replace(/\.(js|html)$/, ''); // Remove .js or .html if present
    
    // Try exact match with repo tag name + .html first (handles "3E_3EI Recruiter" -> "3E_3EI Recruiter Unified")
    let tagFilePath = join(tagsDir, category, `${normalizedRepoTagName}.html`);
    let foundFileName = `${normalizedRepoTagName}.html`;
    
    try {
      await readFile(tagFilePath, 'utf-8');
    } catch {
      // Try exact match with original tag name + .html
      try {
        tagFilePath = join(tagsDir, category, `${normalizedTagName}.html`);
        await readFile(tagFilePath, 'utf-8');
        foundFileName = `${normalizedTagName}.html`;
      } catch {
        // Try exact match without extension (repo tag name)
        try {
          tagFilePath = join(tagsDir, category, normalizedRepoTagName);
          await readFile(tagFilePath, 'utf-8');
          foundFileName = normalizedRepoTagName;
        } catch {
          // Try exact match without extension (original tag name)
          try {
            tagFilePath = join(tagsDir, category, normalizedTagName);
            await readFile(tagFilePath, 'utf-8');
            foundFileName = normalizedTagName;
          } catch {
            // Try with .js extension (repo tag name) - legacy support
            try {
              tagFilePath = join(tagsDir, category, `${normalizedRepoTagName}.js`);
              await readFile(tagFilePath, 'utf-8');
              foundFileName = `${normalizedRepoTagName}.js`;
            } catch {
              // Try with .js extension (original tag name) - legacy support
              try {
                tagFilePath = join(tagsDir, category, `${normalizedTagName}.js`);
                await readFile(tagFilePath, 'utf-8');
                foundFileName = `${normalizedTagName}.js`;
              } catch {
                // Try partial match - search all files in category
                try {
                  const categoryPath = join(tagsDir, category);
                  const files = await readdir(categoryPath);
                  
                  // Find files that start with the normalized repo tag name or original tag name
                  const matchingFile = files.find(file => {
                    const fileWithoutExt = file.replace(/\.(js|html)$/, '');
                    
                    // Check if repo tag name is a prefix of file name or vice versa
                    if (fileWithoutExt.startsWith(normalizedRepoTagName) || 
                        normalizedRepoTagName.startsWith(fileWithoutExt) ||
                        fileWithoutExt === normalizedRepoTagName) {
                      return true;
                    }
                    
                    // Check if original tag name is a prefix of file name or vice versa
                    if (fileWithoutExt.startsWith(normalizedTagName) || 
                        normalizedTagName.startsWith(fileWithoutExt) ||
                        fileWithoutExt === normalizedTagName) {
                      return true;
                    }
                    
                    return false;
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
                        const fileWithoutExt = file.replace(/\.(js|html)$/, '');
                        
                        // Check if repo tag name matches
                        if (fileWithoutExt.startsWith(normalizedRepoTagName) || 
                            normalizedRepoTagName.startsWith(fileWithoutExt) ||
                            fileWithoutExt === normalizedRepoTagName) {
                          return true;
                        }
                        
                        // Check if original tag name matches
                        if (fileWithoutExt.startsWith(normalizedTagName) || 
                            normalizedTagName.startsWith(fileWithoutExt) ||
                            fileWithoutExt === normalizedTagName) {
                          return true;
                        }
                        
                        return false;
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
          name: foundFileName.replace(/\.(js|html)$/, ''), // Return name without .js or .html
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

