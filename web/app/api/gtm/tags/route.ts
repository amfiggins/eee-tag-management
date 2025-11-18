import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { extractVersion } from '@/utils/version-detector';

/**
 * Get list of all available tags from the repository
 */
export async function GET() {
  try {
    // Get tags directory - process.cwd() is the web directory, so go up one level to eee-tag-management, then into tags
    const tagsDir = join(process.cwd(), '..', 'tags');
    const categories = ['base-solutions', 'chatbot-solutions', 'pop-up-solutions'];
    
    const allTags: any[] = [];
    
    for (const category of categories) {
      try {
        const categoryPath = join(tagsDir, category);
        const files = await readdir(categoryPath);
        
        for (const file of files) {
          if (file.startsWith('3E_') || file.startsWith('Template')) {
            const filePath = join(categoryPath, file);
            try {
              const content = await readFile(filePath, 'utf-8');
              const version = extractVersion(content);
              
              allTags.push({
                name: file,
                category,
                version: version?.version || 'Unknown',
                dateUpdated: version?.dateUpdated || 'Unknown',
                description: version?.description,
              });
            } catch (error) {
              // Skip files that can't be read
              console.error(`Error reading ${filePath}:`, error);
            }
          }
        }
      } catch (error) {
        // Category doesn't exist, skip
        continue;
      }
    }
    
    return NextResponse.json({
      success: true,
      tags: allTags,
    });
  } catch (error: any) {
    console.error('Error listing tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tags' },
      { status: 500 }
    );
  }
}

