import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { findPythonExecutable } from '@/utils/python-executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tagName, // Container tag name (for finding tag in GTM)
      repoTagName, // Repo tag name (for finding file) - optional, defaults to tagName
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
    
    // Use repo tag name if provided, otherwise use container tag name
    const fileTagName = repoTagName || tagName;
    
    // Get script file path using the repo tag name
    const scriptPath = join(process.cwd(), '..', 'tags', getTagCategory(fileTagName), fileTagName);
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Fix credentials path - if it starts with "automation/", remove that since we're running from automation directory
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    
    // Use spawn to execute Python script
    const pythonExecutable = findPythonExecutable();
    const containersStr = containerIds.join(',');
    
    return new Promise<NextResponse>((resolve) => {
      const pythonProcess = spawn(pythonExecutable, [
        '-u', // Unbuffered
        pythonScript,
        '--tag-name', tagName,
        '--script-file', scriptPath,
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--containers', containersStr,
        '--delay', '1.0',
      ], {
        cwd: join(process.cwd(), '..', 'automation'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Python script exited with code ${code}`,
              details: stderr || stdout
            },
            { status: 500 }
          ));
          return;
        }

        // Parse results
        const results = parseUpdateOutput(stdout);
        
        resolve(NextResponse.json({
          success: true,
          results,
          output: stdout,
        }));
      });

      pythonProcess.on('error', (error: Error) => {
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to start Python process: ${error.message}`,
            details: error.stack
          },
          { status: 500 }
        ));
      });
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

