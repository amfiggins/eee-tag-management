/**
 * GTM Test Python API Route
 * Ultra-basic test to see if Python works at all
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { accessSync, constants } from 'fs';

/**
 * Test if Python can run and if files exist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, credentialsPath } = body;

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    const fullCredentialsPath = join(process.cwd(), '..', 'automation', fixedCredentialsPath);

    const checks: string[] = [];
    
    // Check if files exist
    try {
      accessSync(pythonScript, constants.F_OK);
      checks.push(`✅ Python script exists: ${pythonScript}`);
    } catch {
      checks.push(`❌ Python script NOT found: ${pythonScript}`);
    }
    
    try {
      accessSync(fullCredentialsPath, constants.F_OK);
      checks.push(`✅ Credentials file exists: ${fullCredentialsPath}`);
    } catch {
      checks.push(`❌ Credentials file NOT found: ${fullCredentialsPath}`);
    }

    // Test 1: Can Python run?
    return new Promise<NextResponse>((resolve) => {
      const testResults: string[] = [...checks];
      
      // Test 1: Just run python --version
      const versionTest = spawn('python3', ['--version']);
      let versionOutput = '';
      let versionError = '';
      
      versionTest.stdout.on('data', (data: Buffer) => {
        versionOutput += data.toString();
      });
      
      versionTest.stderr.on('data', (data: Buffer) => {
        versionError += data.toString();
      });
      
      versionTest.on('close', (code) => {
        if (code === 0) {
          testResults.push(`✅ Python version: ${versionOutput.trim()}`);
        } else {
          testResults.push(`❌ Python version check failed: ${versionError}`);
        }
        
        // Test 2: Can we import the required modules?
        const importTest = spawn('python3', [
          '-c',
          'import sys; sys.path.insert(0, "' + join(process.cwd(), '..', 'automation') + '"); from google.oauth2 import service_account; print("✅ Google auth imports work")'
        ]);
        
        let importOutput = '';
        let importError = '';
        
        importTest.stdout.on('data', (data: Buffer) => {
          importOutput += data.toString();
        });
        
        importTest.stderr.on('data', (data: Buffer) => {
          importError += data.toString();
        });
        
        importTest.on('close', (importCode) => {
          if (importCode === 0) {
            testResults.push(`✅ ${importOutput.trim()}`);
          } else {
            testResults.push(`❌ Import test failed: ${importError.substring(0, 500)}`);
          }
          
          // Test 3: Try to run the script with --help
          const helpTest = spawn('python3', [
            pythonScript,
            '--help'
          ], {
            cwd: join(process.cwd(), '..', 'automation'),
          });
          
          let helpOutput = '';
          let helpError = '';
          let helpTimeout: NodeJS.Timeout;
          
          helpTimeout = setTimeout(() => {
            helpTest.kill();
            testResults.push(`❌ Script --help timed out after 10 seconds`);
            resolve(NextResponse.json({
              success: false,
              error: 'Script help command timed out',
              testResults,
            }));
          }, 10000);
          
          helpTest.stdout.on('data', (data: Buffer) => {
            helpOutput += data.toString();
          });
          
          helpTest.stderr.on('data', (data: Buffer) => {
            helpError += data.toString();
          });
          
          helpTest.on('close', (helpCode) => {
            clearTimeout(helpTimeout);
            if (helpCode === 0 || helpOutput.includes('usage:') || helpOutput.includes('--help')) {
              testResults.push(`✅ Script can run (--help worked)`);
              testResults.push(`Help output: ${helpOutput.substring(0, 200)}`);
            } else {
              testResults.push(`❌ Script --help failed with code ${helpCode}`);
              testResults.push(`Error: ${helpError.substring(0, 500)}`);
            }
            
            resolve(NextResponse.json({
              success: true,
              testResults,
              summary: {
                pythonWorks: testResults.some(r => r.includes('Python version') && r.includes('✅')),
                importsWork: testResults.some(r => r.includes('Google auth imports') && r.includes('✅')),
                scriptWorks: testResults.some(r => r.includes('Script can run') && r.includes('✅')),
                filesExist: testResults.filter(r => r.includes('✅') && (r.includes('exists') || r.includes('found'))).length
              }
            }));
          });
          
          helpTest.on('error', (error) => {
            clearTimeout(helpTimeout);
            testResults.push(`❌ Failed to start script: ${error.message}`);
            resolve(NextResponse.json({
              success: false,
              error: `Failed to start script: ${error.message}`,
              testResults,
            }));
          });
        });
        
        importTest.on('error', (error) => {
          testResults.push(`❌ Failed to start import test: ${error.message}`);
          resolve(NextResponse.json({
            success: false,
            error: `Failed to start import test: ${error.message}`,
            testResults,
          }));
        });
      });
      
      versionTest.on('error', (error) => {
        testResults.push(`❌ Failed to start Python: ${error.message}`);
        resolve(NextResponse.json({
          success: false,
          error: `Python not found: ${error.message}`,
          testResults,
        }));
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Unknown error',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

