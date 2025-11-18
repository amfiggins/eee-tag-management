import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tagName, 
      accountId, 
      credentialsPath, 
      containerIds, 
      skipIfUpToDate = true 
    } = body;
    
    if (!tagName || !accountId || !credentialsPath || !containerIds || !Array.isArray(containerIds)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get script file path
    const scriptPath = join(process.cwd(), '..', 'tags', getTagCategory(tagName), tagName);
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Build command
    const containersStr = containerIds.join(',');
    const command = `python3 "${pythonScript}" --tag-name "${tagName}" --script-file "${scriptPath}" --account-id "${accountId}" --credentials "${credentialsPath}" --containers "${containersStr}" --delay 1.0`;
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: join(process.cwd(), '..', 'automation'),
      maxBuffer: 10 * 1024 * 1024,
    });
    
    // Parse results
    const results = parseUpdateOutput(stdout);
    
    return NextResponse.json({
      success: true,
      results,
      output: stdout,
    });
  } catch (error: any) {
    console.error('Error updating tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tags' },
      { status: 500 }
    );
  }
}

function getTagCategory(tagName: string): string {
  const categoryMap: Record<string, string> = {
    '3E_Analytics Tracking': 'analytics',
    '3E_Page Activity': 'analytics',
    '3E_Form Validation': 'forms',
    '3E_RFI Submit': 'forms',
    '3E_3EI Recruiter Activity': 'tracking',
    '3E_3EI Recruiter Conversion': 'tracking',
    '3E_3EI Recruiter Tracking': 'tracking',
    '3E_3EI Recruiter Unified': 'tracking',
    '3E_Insights Pixel': 'tracking',
    '3E_Pop-up Tracking': 'tracking',
    '3E_Favicon Injection': 'ui',
    '3E_Pop-up': 'ui',
    '3E_Pop-up Marketo Form': 'ui',
    '3E_Sticky Buttons': 'ui',
    '3E_Cloudflare Beacon': 'integrations',
  };
  
  return categoryMap[tagName] || 'ui';
}

function parseUpdateOutput(output: string): any {
  const lines = output.split('\n');
  const results: any[] = [];
  
  for (const line of lines) {
    if (line.includes('Processing container:')) {
      const containerMatch = line.match(/Processing container:\s*(\d+)/);
      if (containerMatch) {
        results.push({
          containerId: containerMatch[1],
          status: 'processing',
        });
      }
    }
    
    if (line.includes('Tag updated successfully')) {
      const lastResult = results[results.length - 1];
      if (lastResult) {
        lastResult.status = 'success';
      }
    }
    
    if (line.includes('Failed to update')) {
      const lastResult = results[results.length - 1];
      if (lastResult) {
        lastResult.status = 'failed';
      }
    }
  }
  
  return results;
}

