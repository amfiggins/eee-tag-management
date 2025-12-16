<script>
// Script Name: 3E_Sticky Buttons
// Author: Anthony Figgins
// Description: Handles mobile sticky button functionality for header CTAs with 3E config integration.
// Version: 1.2.4
// Date Updated: 2025-12-11

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
        console.log('[3E_Sticky Buttons] v1.2.4');
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

    // Create chatbot iframe container in sticky container (.hdr_right_v2)
    function createChatbotContainer() {
        try {
            // Check if container already exists
            var existing = document.getElementById('chatbot-iframe-container');
            if (existing) {
                debugLog('Chatbot iframe container already exists');
                return existing;
            }

            // Target .hdr_right_v2 container (the sticky header container on mobile)
            var stickyContainer = document.querySelector('.hdr_right_v2');
            if (!stickyContainer) {
                debugLog('No .hdr_right_v2 container found for chatbot iframe container');
                return null;
            }

            // Inspect other buttons in container to match height and spacing
            var otherButtons = stickyContainer.querySelectorAll('button, a[href]');
            var buttonHeight = '50px'; // Default fallback
            var buttonSpacing = '12px'; // Default spacing fallback
            
            if (otherButtons.length > 0) {
                // Get height from first button
                var firstButton = otherButtons[0];
                var computedStyle = window.getComputedStyle(firstButton);
                var height = computedStyle.height;
                if (height && height !== 'auto') {
                    buttonHeight = height;
                    debugLog('Matched button height from existing button:', height);
                }
                
                // Calculate spacing between buttons (if multiple buttons exist)
                if (otherButtons.length > 1) {
                    var rect1 = otherButtons[0].getBoundingClientRect();
                    var rect2 = otherButtons[1].getBoundingClientRect();
                    var spacing = Math.abs(rect2.left - rect1.right);
                    if (spacing > 0 && spacing < 50) { // Reasonable spacing range
                        buttonSpacing = spacing + 'px';
                        debugLog('Matched button spacing from existing buttons:', buttonSpacing);
                    }
                }
            }

            // Create container div (acts as window for iframe)
            var container = document.createElement('div');
            container.id = 'chatbot-iframe-container';
            container.className = 'chatbot-iframe-container';

            // Inline styles for container (matches button size initially)
            var containerStyle = container.style;
            containerStyle.width = '50px'; // Match button width
            containerStyle.height = buttonHeight; // Match button height
            containerStyle.borderRadius = '50%'; // Perfect circle for compact view
            containerStyle.overflow = 'hidden'; // Clip iframe to container size
            containerStyle.position = 'relative';
            containerStyle.margin = '0';
            containerStyle.marginLeft = buttonSpacing; // Match spacing between other buttons
            containerStyle.flexShrink = '0';
            containerStyle.cursor = 'pointer'; // Indicates it's clickable

            stickyContainer.appendChild(container);

            debugLog('Chatbot iframe container created in .hdr_right_v2 container', {
                containerTag: stickyContainer.tagName,
                containerId: stickyContainer.id,
                containerClass: stickyContainer.className,
                containerSize: containerStyle.width + ' x ' + containerStyle.height
            });

            return container;
        } catch (error) {
            debugLog('createChatbotContainer error: ' + error.message);
            return null;
        }
    }

    // Update chatbot container visibility based on mobile state
    function updateChatbotContainer() {
        try {
            var isMobile = window.innerWidth < 576;
            var container = document.getElementById('chatbot-iframe-container');
            
            if (container) {
                // Container exists - visibility controlled by chatbot embed script
                // We just ensure it's created on mobile
                if (isMobile) {
                    debugLog('Chatbot iframe container exists on mobile viewport');
                } else {
                    debugLog('Chatbot iframe container exists on desktop viewport (will be hidden)');
                }
            } else if (isMobile) {
                // Create container on mobile if it doesn't exist
                createChatbotContainer();
            }
        } catch (error) {
            debugLog('updateChatbotContainer error: ' + error.message);
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

            // Update chatbot iframe container
            updateChatbotContainer();
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
            
            // Initial chatbot iframe container creation (with slight delay to ensure footer is ready)
            setTimeout(function() {
                var isMobile = window.innerWidth < 576;
                if (isMobile) {
                    createChatbotContainer();
                }
            }, 100);
            
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
