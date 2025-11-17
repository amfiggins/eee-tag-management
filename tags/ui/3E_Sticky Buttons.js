<script>
// Script Name: 3E_Sticky Buttons
// Author: Anthony Figgins
// Description: Handles mobile sticky button functionality for header CTAs with 3E config integration.
// Version: 1.2.0
// Date Updated: 2025-10-03

(function() {
    // Pull configuration from 3E Config variable
    var CFG;
    try { 
        CFG = {{3E config}}; 
    } catch(e) { 
        console.error('[3E Sticky Buttons] Failed to load 3E config:', e);
        CFG = {}; 
    }

    // Configuration options from 3E config with fallbacks
    var debugMode = CFG.debugMode === 'true';

    // Log script name and version on load (only in debug mode)
    if (debugMode) {
        console.log('[3E_Sticky Buttons] v1.2.0');
        console.log("3E Sticky Buttons Script Initialized");
        console.log("Debug Mode:", debugMode);
    }

    // Page targeting function - run on Marketo landing pages or 3enrollment testing domain
    function shouldRunOnThisPage() {
        var currentUrl = window.location.href.toLowerCase();
        var currentHostname = window.location.hostname.toLowerCase();
        
        // Check for 3enrollment testing domain
        if (currentHostname.indexOf('3enrollment') !== -1) {
            if (debugMode) {
                console.log('[3E Sticky Buttons] Page targeting check passed - 3enrollment testing domain detected');
            }
            return true;
        }
        
        // Check for Marketo landing page identifier
        var formSection = document.getElementById('form_sec');
        if (!formSection) {
            if (debugMode) {
                console.log('[3E Sticky Buttons] Not running - #form_sec not found and not on 3enrollment domain');
            }
            return false;
        }
        
        if (debugMode) {
            console.log('[3E Sticky Buttons] Page targeting check passed - Marketo landing page detected');
        }
        return true;
    }
  
    // Debug logging function
    function debugLog(message, data) {
        if (debugMode) {
            if (data) {
                console.log('[3E Sticky Buttons]', message, data);
            } else {
                console.log('[3E Sticky Buttons]', message);
            }
        }
    }

    // Sticky buttons functionality
    function updateStickyButtons() {
        try {
            var stickyBtn = document.querySelector(".hdr_right");
            var stickyBtnV2 = document.querySelector(".hdr_right_v2");
            var isMobile = window.innerWidth < 576;

            if (stickyBtn) {
                stickyBtn.classList.toggle("sticky-btn", isMobile);
                debugLog('Updated .hdr_right sticky state: ' + isMobile);
            }
            if (stickyBtnV2) {
                stickyBtnV2.classList.toggle("sticky-btn-v2", isMobile);
                debugLog('Updated .hdr_right_v2 sticky state: ' + isMobile);
            }
        } catch (error) {
            debugLog('Update failed: ' + error.message);
        }
    }

    // Initialize sticky buttons
    function initStickyButtons() {
        try {
            // Run on load
            updateStickyButtons();

            // Run on resize with throttling
            window.addEventListener("resize", function() {
                clearTimeout(window.__stickyResize);
                window.__stickyResize = setTimeout(updateStickyButtons, 100);
            });
            
            debugLog('Sticky buttons initialized');
        } catch (error) {
            debugLog('Initialization failed: ' + error.message);
        }
    }

    // Check if script should run on this page
    if (!shouldRunOnThisPage()) {
        if (debugMode) {
            console.log('[3E Sticky Buttons] Script not running on this page due to targeting configuration');
        }
        return;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initStickyButtons);
    } else {
        initStickyButtons();
    }
})();
</script>
