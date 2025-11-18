<script>
// Script Name: 3E_Favicon Injection
// Author: Anthony Figgins
// Description: Dynamically injects favicon links into the page head with 3E config integration.
// Version: 1.2.0
// Date Updated: 2025-10-03

(function() {
    // Pull configuration from 3E Config variable
    var CFG;
    try { 
        CFG = {{3E config}}; 
    } catch(e) { 
        console.error('[3E Favicon Injection] Failed to load 3E config:', e);
        CFG = {}; 
    }

    // Configuration options from 3E config with fallbacks
    var debugMode = CFG.debugMode === 'true';

    // Log script name and version on load (only in debug mode)
    if (debugMode) {
        console.log('[3E_Favicon Injection] v1.2.0');
        console.log("3E Favicon Injection Script Initialized");
        console.log("Debug Mode:", debugMode);
    }

    // Page targeting function - run on Marketo landing pages or 3enrollment testing domain
    function shouldRunOnThisPage() {
        var currentUrl = window.location.href.toLowerCase();
        var currentHostname = window.location.hostname.toLowerCase();
        
        // Check for 3enrollment testing domain
        if (currentHostname.indexOf('3enrollment') !== -1) {
            if (debugMode) {
                console.log('[3E Favicon Injection] Page targeting check passed - 3enrollment testing domain detected');
            }
            return true;
        }
        
        // Check for Marketo landing page identifier
        var formSection = document.getElementById('form_sec');
        if (!formSection) {
            if (debugMode) {
                console.log('[3E Favicon Injection] Not running - #form_sec not found and not on 3enrollment domain');
            }
            return false;
        }
        
        if (debugMode) {
            console.log('[3E Favicon Injection] Page targeting check passed - Marketo landing page detected');
        }
        return true;
    }
  
    // Debug logging function
    function debugLog(message, data) {
        if (debugMode) {
            if (data) {
                console.log('[3E Favicon Injection]', message, data);
            } else {
                console.log('[3E Favicon Injection]', message);
            }
        }
    }

    // Initialize favicon injection
    function initFaviconInjection() {
        try {
            // Remove existing favicon links
            var existingLinks = document.querySelectorAll("link[rel~='icon']");
            if (existingLinks.length) {
                existingLinks.forEach(function(link) {
                    if (link && link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                });
                debugLog('Removed ' + existingLinks.length + ' existing favicon links');
            }

            // Get favicon URL from 3E Config
            var faviconUrl = CFG.faviconUrl || '';
            
            if (faviconUrl && faviconUrl.trim() !== '') {
                // Create shortcut icon link
                var shortcutLink = document.createElement('link');
                shortcutLink.rel = 'shortcut icon';
                shortcutLink.href = faviconUrl;
                document.head.appendChild(shortcutLink);

                // Create icon link
                var iconLink = document.createElement('link');
                iconLink.rel = 'icon';
                iconLink.href = faviconUrl;
                document.head.appendChild(iconLink);
                
                debugLog('Favicon injected: ' + faviconUrl);
            } else {
                debugLog('No favicon URL provided');
            }
        } catch (error) {
            debugLog('Injection failed: ' + error.message);
        }
    }

    // Check if script should run on this page
    if (!shouldRunOnThisPage()) {
        if (debugMode) {
            console.log('[3E Favicon Injection] Script not running on this page due to targeting configuration');
        }
        return;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initFaviconInjection);
    } else {
        initFaviconInjection();
    }
})();
</script>
