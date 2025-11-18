/**
 * Main Page Component
 * GTM Tag Management web interface with tabs for tag search and container browser
 * 
 * Author: Anthony Figgins
 * Version: 1.1.0
 * Date Updated: 2025-11-17
 */

'use client';

import { useState } from 'react';
import TagSearch from '@/components/tag-search';
import ContainerList from '@/components/container-list';
import ContainerBrowser from '@/components/container-browser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { WEB_VERSION, VERSION_DATE } from './version';

export default function Home() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  // Shared credentials state
  const [accountId, setAccountId] = useState('4702086067');
  const [credentialsPath, setCredentialsPath] = useState('automation/gtm-oauth-credentials.json');

  return (
    <div className="min-h-screen p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-6xl w-full mx-auto mt-5 border-t-4 border-[#FFD700]">
        {/* Logo Container - Horizontal Split Layout */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-200 gap-6">
          {/* Logo on the left - Centered */}
          <div className="flex-shrink-0 flex-1 flex items-center justify-center">
            {!logoError ? (
              <img 
                src="https://3enrollment.com/wp-content/uploads/2023/10/3E_Website_Logo_2.png" 
                alt="3E Enrollment Logo" 
                className="max-w-[180px] h-auto drop-shadow-sm"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="text-5xl font-bold" style={{ letterSpacing: '6px', padding: '10px' }}>
                <span style={{ color: '#FFD700' }}>3</span><span style={{ color: '#1a1a1a' }}>E</span>
              </div>
            )}
          </div>
          
          {/* Text content on the right - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GTM Tag Management</h1>
            <p className="text-gray-600 text-sm mb-1">Manage and update tags across Google Tag Manager containers</p>
            <p className="text-xs text-gray-500 font-mono">Version {WEB_VERSION} • Updated {VERSION_DATE}</p>
          </div>
        </div>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Tag Search</TabsTrigger>
            <TabsTrigger value="browser">Container Browser</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="mt-6">
            <TagSearch 
              accountId={accountId}
              credentialsPath={credentialsPath}
              onSearchComplete={(results, tagNames) => {
                setSearchResults(results);
                setSelectedTag(tagNames.join(', '));
              }}
            />
            
            {searchResults && (
              <div className="mt-6">
                <ContainerList 
                  containers={searchResults.containers}
                  tagName={selectedTag}
                  repoVersion={searchResults.repoVersion}
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="browser" className="mt-6">
            <ContainerBrowser 
              accountId={accountId}
              credentialsPath={credentialsPath}
            />
          </TabsContent>
          
          <TabsContent value="credentials" className="mt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">GTM Account & Credentials</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Configure your GTM account ID and credentials path. These settings are shared across all tabs.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">GTM Account ID</label>
                  <Input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="e.g., 4702086067"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Google Tag Manager account ID</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Credentials Path</label>
                  <Input
                    type="text"
                    value={credentialsPath}
                    onChange={(e) => setCredentialsPath(e.target.value)}
                    placeholder="e.g., automation/gtm-oauth-credentials.json"
                  />
                  <p className="text-xs text-gray-500 mt-1">Path to your OAuth credentials file</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

