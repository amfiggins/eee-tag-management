<script>
// Script Name: 3E_Cloudflare Beacon
// Author: Anthony Figgins
// Description: Cloudflare Web Analytics and performance monitoring with 3E config integration.
// Version: 1.2.0
// Date Updated: 2025-10-03

(function() {
    // Pull configuration from 3E Config variable
    var CFG;
    try { 
        CFG = {{3E config}}; 
    } catch(e) { 
        console.error('[3E Cloudflare Beacon] Failed to load 3E config:', e);
        CFG = {}; 
    }

    // Configuration options from 3E config with fallbacks
    var debugMode = CFG.debugMode === 'true';

    // Log script name and version on load (only in debug mode)
    if (debugMode) {
        console.log('[3E_Cloudflare Beacon] v1.2.0');
        console.log("3E Cloudflare Beacon Script Initialized");
        console.log("Debug Mode:", debugMode);
    }

    // Page targeting function - run on Marketo landing pages or 3enrollment testing domain
    function shouldRunOnThisPage() {
        var currentUrl = window.location.href.toLowerCase();
        var currentHostname = window.location.hostname.toLowerCase();
        
        // Check for 3enrollment testing domain
        if (currentHostname.indexOf('3enrollment') !== -1) {
            if (debugMode) {
                console.log('[3E Cloudflare Beacon] Page targeting check passed - 3enrollment testing domain detected');
            }
            return true;
        }
        
        // Check for Marketo landing page identifier
        var formSection = document.getElementById('form_sec');
        if (!formSection) {
            if (debugMode) {
                console.log('[3E Cloudflare Beacon] Not running - #form_sec not found and not on 3enrollment domain');
            }
            return false;
        }
        
        if (debugMode) {
            console.log('[3E Cloudflare Beacon] Page targeting check passed - Marketo landing page detected');
        }
        return true;
    }
  
    // Cloudflare configuration
    var cfConfig = {
        "rayId": "9379a328297915e6",
        "serverTiming": {
            "name": {
                "cfExtPri": true,
                "cfL4": true,
                "cfSpeedBrain": true,
                "cfCacheStatus": true
            }
        },
        "version": "2025.4.0-1-g37f21b1",
        "token": CFG.cloudflareToken || "271854501d8743cfb7cc749ee8f2dde0"
    };

    // Debug logging function
    function debugLog(message, data) {
        if (debugMode) {
            if (data) {
                console.log('[3E Cloudflare Beacon]', message, data);
            } else {
                console.log('[3E Cloudflare Beacon]', message);
            }
        }
    }

    // Initialize Cloudflare beacon
    function initCloudflareBeacon() {
        try {
            // Create configuration script
            var configScript = document.createElement('script');
            configScript.id = 'cf-config';
            configScript.type = 'application/json';
            configScript.textContent = JSON.stringify(cfConfig);
            document.head.appendChild(configScript);

            // Create and load beacon script
            var beaconScript = document.createElement('script');
            beaconScript.crossOrigin = 'anonymous';
            beaconScript.setAttribute('data-config-id', 'cf-config');
            beaconScript.defer = true;
            beaconScript.src = 'https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015';
            document.head.appendChild(beaconScript);
            
            debugLog('Cloudflare beacon initialized');
        } catch (error) {
            debugLog('Initialization failed: ' + error.message);
        }
    }

    // Check if script should run on this page
    if (!shouldRunOnThisPage()) {
        if (debugMode) {
            console.log('[3E Cloudflare Beacon] Script not running on this page due to targeting configuration');
        }
        return;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initCloudflareBeacon);
    } else {
        initCloudflareBeacon();
    }
})();
</script>
