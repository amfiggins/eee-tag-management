/**
 * Main Page Component
 * GTM Tag Management web interface with tabs for tag search and container browser
 * 
 * Author: Anthony Figgins
 * Version: 1.0.2
 * Date Updated: 2025-11-17
 */

'use client';

import { useState } from 'react';
import TagSearch from '@/components/tag-search';
import ContainerList from '@/components/container-list';
import ContainerBrowser from '@/components/container-browser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WEB_VERSION, VERSION_DATE } from './version';

export default function Home() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-6xl w-full mx-auto mt-5 border-t-4 border-[#FFD700]">
        {/* Logo Container */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center justify-center mb-3">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GTM Tag Management</h1>
          <p className="text-gray-600 text-sm mb-1">Manage and update tags across Google Tag Manager containers</p>
          <p className="text-xs text-gray-500 font-mono">Version {WEB_VERSION} • Updated {VERSION_DATE}</p>
        </div>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Tag Search</TabsTrigger>
            <TabsTrigger value="browser">Container Browser</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="mt-6">
            <TagSearch 
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
            <ContainerBrowser />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

