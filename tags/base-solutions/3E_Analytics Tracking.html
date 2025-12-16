<script>
// Script Name: 3E_Analytics Tracking
// Author: Anthony Figgins
// Description: Comprehensive analytics tracking including CTA click tracking, scroll depth tracking, form interaction tracking, video engagement tracking, and performance monitoring with 3E config integration.
// Version: 1.2.0
// Date Updated: 2025-10-03

(function() {
    // Pull configuration from 3E Config variable
    var CFG;
    try { 
        CFG = {{3E config}}; 
    } catch(e) { 
        console.error('[3E Analytics Tracking] Failed to load 3E config:', e);
        CFG = {}; 
    }

    // Configuration options from 3E config with fallbacks
    var debugMode = CFG.debugMode === 'true';

    // Log script name and version on load (only in debug mode)
    if (debugMode) {
        console.log('[3E_Analytics Tracking] v1.2.0');
        console.log("3E Analytics Tracking Script Initialized");
        console.log("Debug Mode:", debugMode);
    }

    // Page targeting function - run on Marketo landing pages or 3enrollment testing domain
    function shouldRunOnThisPage() {
        var currentUrl = window.location.href.toLowerCase();
        var currentHostname = window.location.hostname.toLowerCase();
        
        // Check for 3enrollment testing domain
        if (currentHostname.indexOf('3enrollment') !== -1) {
            if (debugMode) {
                console.log('[3E Analytics Tracking] Page targeting check passed - 3enrollment testing domain detected');
            }
            return true;
        }
        
        // Check for Marketo landing page identifier
        var formSection = document.getElementById('form_sec');
        if (!formSection) {
            if (debugMode) {
                console.log('[3E Analytics Tracking] Not running - #form_sec not found and not on 3enrollment domain');
            }
            return false;
        }
        
        if (debugMode) {
            console.log('[3E Analytics Tracking] Page targeting check passed - Marketo landing page detected');
        }
        return true;
    }
  
    // Ensure dataLayer exists for GTM
    window.dataLayer = window.dataLayer || [];
    
    // Debug logging function
    function debugLog(message, data) {
        if (debugMode) {
            if (data) {
                console.log('[3E Analytics Tracking]', message, data);
            } else {
                console.log('[3E Analytics Tracking]', message);
            }
        }
    }
    
    // Main analytics initialization
    function initAnalytics() {
        // Click Tracking for CTAs (GTM + Google Analytics - Marketo Munchkin handles this automatically)
        function trackCTAClick(element, ctaName, ctaLocation) {
            element.addEventListener('click', function(e) {
                // Send to GTM dataLayer
                dataLayer.push({
                    'event': 'cta_click',
                    'cta_name': ctaName,
                    'cta_location': ctaLocation,
                    'page_title': document.title,
                    'page_url': window.location.href
                });
                
                // Google Analytics 4
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'cta_click', {
                        'cta_name': ctaName,
                        'cta_location': ctaLocation,
                        'page_title': document.title,
                        'page_url': window.location.href
                    });
                }
                
                // Google Analytics Universal (if available)
                if (typeof ga !== 'undefined') {
                    ga('send', 'event', 'CTA', 'Click', ctaName + ' - ' + ctaLocation);
                }
                
                debugLog('CTA Clicked: ' + ctaName + ' at ' + ctaLocation);
            });
        }
    
        // Track all CTA buttons and links
        var ctaSelectors = [
            { selector: '.header a[href*="http"]', name: 'Header CTA', location: 'Header' },
            { selector: '.banner a[href*="http"]', name: 'Hero CTA', location: 'Hero' },
            { selector: '.section3 a[href*="http"]', name: 'Benefits CTA', location: 'Benefits' },
            { selector: '.section4 a[href*="http"]', name: 'Benefits 2 CTA', location: 'Benefits 2' },
            { selector: '.section5 a[href*="http"]', name: 'Testimonial CTA', location: 'Testimonial' },
            { selector: '.section6 a[href*="http"]', name: 'Apply CTA', location: 'Apply' },
            { selector: '.section7 a[href*="http"]', name: 'Visit CTA', location: 'Visit' },
            { selector: '.section8 a[href*="http"]', name: 'Next Steps CTA', location: 'Next Steps' },
            { selector: '.section9 a[href*="http"]', name: 'Academic Hub CTA', location: 'Academic Hub' },
            { selector: '.section10 a[href*="http"]', name: 'Gallery CTA', location: 'Gallery' },
            { selector: '.section11 a[href*="http"]', name: 'Unique Opportunities CTA', location: 'Unique Opportunities' },
            { selector: '.section12 a[href*="http"]', name: 'Form CTA', location: 'Form' },
            { selector: '.section13 a[href*="http"]', name: 'Why College CTA', location: 'Why College' },
            { selector: '.section14 a[href*="http"]', name: 'Reasons CTA', location: 'Reasons' },
            { selector: '.footer a[href*="http"]', name: 'Footer CTA', location: 'Footer' }
        ];
        
        ctaSelectors.forEach(function(cta) {
            var elements = document.querySelectorAll(cta.selector);
            elements.forEach(function(element) {
                trackCTAClick(element, cta.name, cta.location);
            });
        });
    
        // Scroll Depth Tracking
        var maxScrollDepth = 0;
        var scrollMilestones = [25, 50, 75, 90, 100];
        var trackedMilestones = [];
        
        function trackScrollDepth() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            var scrollPercent = Math.round((scrollTop / documentHeight) * 100);
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
            }
            
            scrollMilestones.forEach(function(milestone) {
                if (scrollPercent >= milestone && trackedMilestones.indexOf(milestone) === -1) {
                    trackedMilestones.push(milestone);
                    
                    // Send to GTM dataLayer
                    dataLayer.push({
                        'event': 'scroll_depth',
                        'scroll_depth': milestone,
                        'page_title': document.title,
                        'page_url': window.location.href
                    });
                    
                    // Google Analytics 4
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'scroll_depth', {
                            'scroll_depth': milestone,
                            'page_title': document.title,
                            'page_url': window.location.href
                        });
                    }
                    
                    // Google Analytics Universal
                    if (typeof ga !== 'undefined') {
                        ga('send', 'event', 'Scroll', 'Depth', milestone + '%');
                    }
                    
                    debugLog('Scroll Depth: ' + milestone + '%');
                }
            });
        }
        
        // Throttled scroll tracking
        var scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(trackScrollDepth, 100);
        });
    
        // Form Interaction Tracking
        function trackFormInteraction(formElement, interactionType, fieldName) {
            // Send to GTM dataLayer
            dataLayer.push({
                'event': 'form_interaction',
                'form_name': 'Lead Capture Form',
                'interaction_type': interactionType,
                'field_name': fieldName,
                'page_title': document.title,
                'page_url': window.location.href
            });
            
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_interaction', {
                    'form_name': 'Lead Capture Form',
                    'interaction_type': interactionType,
                    'field_name': fieldName,
                    'page_title': document.title,
                    'page_url': window.location.href
                });
            }
            
            // Google Analytics Universal
            if (typeof ga !== 'undefined') {
                ga('send', 'event', 'Form', interactionType, fieldName);
            }
            
            debugLog('Form Interaction: ' + interactionType + ' ' + fieldName);
        }
        
        // Track form interactions
        var formElement = document.querySelector('.mktoForm');
        if (formElement) {
            // Track form focus events
            var formFields = formElement.querySelectorAll('input, select, textarea');
            formFields.forEach(function(field) {
                field.addEventListener('focus', function() {
                    trackFormInteraction(formElement, 'focus', field.name || field.id || 'unknown_field');
                });
                
                field.addEventListener('blur', function() {
                    trackFormInteraction(formElement, 'blur', field.name || field.id || 'unknown_field');
                });
            });
            
            // Track form submission
            formElement.addEventListener('submit', function(e) {
                trackFormInteraction(formElement, 'submit', 'form_submission');
            });
        }
    
        // Video Engagement Tracking
        function trackVideoEngagement(videoElement, engagementType, timePercent) {
            // Send to GTM dataLayer
            dataLayer.push({
                'event': 'video_engagement',
                'video_title': videoElement.title || 'Unknown Video',
                'engagement_type': engagementType,
                'time_percent': timePercent,
                'page_title': document.title,
                'page_url': window.location.href
            });
            
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'video_engagement', {
                    'video_title': videoElement.title || 'Unknown Video',
                    'engagement_type': engagementType,
                    'time_percent': timePercent,
                    'page_title': document.title,
                    'page_url': window.location.href
                });
            }
            
            // Google Analytics Universal
            if (typeof ga !== 'undefined') {
                ga('send', 'event', 'Video', engagementType, videoElement.title || 'Unknown Video', timePercent);
            }
            
            debugLog('Video Engagement: ' + engagementType + ' ' + timePercent + '%');
        }
        
        // Track video interactions
        var videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
        videos.forEach(function(video) {
            var hasPlayed = false;
            var hasPaused = false;
            var hasEnded = false;
            
            if (video.tagName === 'VIDEO') {
                video.addEventListener('play', function() {
                    if (!hasPlayed) {
                        hasPlayed = true;
                        trackVideoEngagement(video, 'play', 0);
                    }
                });
                
                video.addEventListener('pause', function() {
                    if (!hasPaused) {
                        hasPaused = true;
                        var timePercent = Math.round((video.currentTime / video.duration) * 100);
                        trackVideoEngagement(video, 'pause', timePercent);
                    }
                });
                
                video.addEventListener('ended', function() {
                    if (!hasEnded) {
                        hasEnded = true;
                        trackVideoEngagement(video, 'complete', 100);
                    }
                });
            }
        });
    
        // Page Load Performance Tracking
        window.addEventListener('load', function() {
            var loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            
            // Send to GTM dataLayer
            dataLayer.push({
                'event': 'page_load_time',
                'load_time': loadTime,
                'page_title': document.title,
                'page_url': window.location.href
            });
            
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_load_time', {
                    'load_time': loadTime,
                    'page_title': document.title,
                    'page_url': window.location.href
                });
            }
            
            debugLog('Page Load Time: ' + loadTime + 'ms');
        });
        
        // Time on Page Tracking
        var startTime = Date.now();
        var timeOnPage = 0;
        
        setInterval(function() {
            timeOnPage = Math.round((Date.now() - startTime) / 1000);
            
            // Track every 30 seconds
            if (timeOnPage % 30 === 0 && timeOnPage > 0) {
                // Send to GTM dataLayer
                dataLayer.push({
                    'event': 'time_on_page',
                    'time_seconds': timeOnPage,
                    'page_title': document.title,
                    'page_url': window.location.href
                });
                
                // Google Analytics 4
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'time_on_page', {
                        'time_seconds': timeOnPage,
                        'page_title': document.title,
                        'page_url': window.location.href
                    });
                }
                
                debugLog('Time on Page: ' + timeOnPage + ' seconds');
            }
        }, 1000);
        
        debugLog('Analytics tracking initialized');
    }
  
    // Check if script should run on this page
    if (!shouldRunOnThisPage()) {
        if (debugMode) {
            console.log('[3E Analytics Tracking] Script not running on this page due to targeting configuration');
        }
        return;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }
})();
</script>
