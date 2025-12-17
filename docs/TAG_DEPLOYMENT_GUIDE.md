# 3E Tag Manager Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2025-12-17  
**Author:** 3E Enrollment Development Team

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Base Solutions](#base-solutions)
4. [Chatbot Solutions](#chatbot-solutions)
5. [Pop-up Solutions](#pop-up-solutions)
6. [General Troubleshooting](#general-troubleshooting)
7. [Debug Mode Usage](#debug-mode-usage)

---

## Introduction

This guide provides comprehensive documentation for deploying and validating 3E Tag Manager scripts in Google Tag Manager (GTM) containers. Each tag is documented with its purpose, how it works, validation steps, and troubleshooting tips.

**Who This Guide Is For:**
- Deployment team members
- QA testers
- Support staff
- Developers validating tag functionality

**What This Guide Covers:**
- Tag locations and file paths
- What each tag does (in simple terms)
- How each tag works (technical flow)
- Step-by-step validation procedures
- Common issues and solutions

---

## Prerequisites

### Required Setup

Before deploying any tags, ensure the following are configured:

1. **3E Config Variable Template**
   - **Location:** `tags/base-solutions/Template - 3E Config.html`
   - **Type:** GTM Variable Template
   - **Must be deployed FIRST** before any other tags
   - Contains all configuration settings used by other tags

2. **GTM Container Access**
   - Ensure you have appropriate permissions (Edit, Publish)
   - Verify container ID is correct
   - Confirm account ID matches the container

3. **Dependencies**
   - **Marketo Munchkin:** Required for tracking tags (loaded automatically or via 3E_Insights Pixel)
   - **Marketo Forms2:** Required for form-related tags (loaded automatically by Marketo forms)
   - **3E Config:** Required for all tags except Template - 3E Config

### Debug Mode

Enable debug mode in 3E Config to see detailed console logs:
- Set `debugMode: 'true'` in 3E Config
- Open browser console (F12) to view debug messages
- All tags log their version and initialization status when debug mode is enabled

---

## Base Solutions

Base solutions provide core functionality for all client implementations. These should be deployed for every client.

---

### Template - 3E Config

**File Location:** `tags/base-solutions/Template - 3E Config.html`  
**Version:** 2.2  
**Type:** GTM Variable Template  
**Dependencies:** None

#### What It Does

The 3E Config is a central configuration hub that stores all settings used by other tags. Think of it as a settings file that all other scripts read from. It must be set up as a GTM Variable Template before deploying any other tags.

#### How It Works

1. The template is configured in GTM as a Variable
2. When other tags load, they read configuration values from this variable
3. Settings include Marketo credentials, chatbot IDs, form validation toggles, and more
4. All tags reference `{{3E config}}` to access these settings

#### Validation Process

1. **Verify Variable Setup:**
   - Go to GTM → Variables
   - Confirm "3E Config" variable exists
   - Check that it's configured with required settings

2. **Verify Configuration Values:**
   - Open variable configuration
   - Verify `baseUrl` is set (Marketo instance URL)
   - Verify `munchkinId` is set (Marketo tracking ID)
   - Verify `debugMode` is set (for testing: 'true', for production: 'false')

3. **Test Variable Access:**
   - Enable debug mode in 3E Config
   - Deploy a tag that uses 3E Config (e.g., 3E_Analytics Tracking)
   - Check browser console for initialization messages
   - Verify no "Failed to load 3E config" errors

#### Troubleshooting

**Issue:** Tags show "Failed to load 3E config" errors  
**Solution:** 
- Verify 3E Config variable is created in GTM
- Check variable name matches exactly (case-sensitive)
- Ensure variable is published in the container

**Issue:** Configuration values not applying  
**Solution:**
- Verify variable is saved and published
- Check for typos in configuration keys
- Clear browser cache and reload page

---

### 3E_Analytics Tracking

**File Location:** `tags/base-solutions/3E_Analytics Tracking.html`  
**Version:** 1.2.0  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Tracks user interactions on the page including button clicks, scroll depth, form interactions, video engagement, and page performance. This data is sent to analytics platforms and helps understand how users engage with the website.

#### How It Works

1. Script loads when page loads
2. Listens for user interactions (clicks, scrolling, form interactions)
3. Tracks scroll depth at 25%, 50%, 75%, and 100%
4. Monitors video play/pause/complete events
5. Measures page load performance
6. Pushes events to dataLayer for GTM triggers

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Analytics Tracking] v1.2.0`
   - Verify script initialized message

3. **Test Scroll Tracking:**
   - Scroll page to 25%, 50%, 75%, 100%
   - Check console for scroll depth events
   - Verify dataLayer events: `scroll_depth_25`, `scroll_depth_50`, etc.

4. **Test Click Tracking:**
   - Click on buttons/links with CTA classes
   - Check console for click tracking messages
   - Verify dataLayer events for clicks

5. **Test Form Interaction:**
   - Interact with form fields
   - Check console for form interaction events
   - Verify dataLayer events for form interactions

#### Troubleshooting

**Issue:** No scroll tracking events  
**Solution:**
- Verify script is loaded (check console for initialization)
- Check if page is long enough to trigger scroll events
- Verify 3E Config is loaded correctly

**Issue:** Click events not firing  
**Solution:**
- Verify buttons/links have correct CSS classes
- Check console for click detection messages
- Ensure elements are clickable (not covered by other elements)

---

### 3E_Page Activity

**File Location:** `tags/base-solutions/3E_Page Activity.html`  
**Version:** 1.3.1  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Munchkin

#### What It Does

Tracks how long users stay on a page by sending "visit" events to Marketo at regular intervals. This helps measure engagement and time spent on pages.

#### How It Works

1. Script loads when page loads
2. Waits for Marketo Munchkin to be available
3. Sends visit events to Marketo at configurable intervals (default: every 30 seconds)
4. Continues tracking as long as user stays on page
5. Stops when user navigates away

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Page Activity] v1.3.1`
   - Verify "Page Activity Script Initialized" message

3. **Verify Marketo Munchkin:**
   - Check console for "Marketo Munchkin detected" message
   - If not detected, verify Munchkin is loaded or 3E_Insights Pixel is deployed

4. **Test Visit Tracking:**
   - Stay on page for 30+ seconds
   - Check console for visit event messages
   - Verify Marketo receives visit events (check Marketo activity log)

#### Troubleshooting

**Issue:** "Marketo Munchkin not detected" error  
**Solution:**
- Verify Marketo Munchkin is loaded on page
- Deploy 3E_Insights Pixel to load Munchkin dynamically
- Check Munchkin ID in 3E Config matches Marketo instance

**Issue:** Visit events not sending  
**Solution:**
- Verify Munchkin is loaded (check console)
- Check interval setting in 3E Config
- Verify page is active (not in background tab)

---

### 3E_Form Validation

**File Location:** `tags/base-solutions/3E_Form Validation.html`  
**Version:** 7.3.1  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Adds extra validation to Marketo forms to prevent spam and ensure data quality. It can check for duplicate names, block default names like "first" and "last", validate .edu email addresses, block specific IP addresses, and add math question challenges.

#### How It Works

1. Script waits for Marketo Forms2 to load
2. Finds Marketo forms on the page
3. Skips hidden conversion forms (handled by chatbot script)
4. Adds validation rules based on 3E Config settings:
   - Name validation (first name ≠ last name)
   - Default name prevention
   - EDU email validation
   - IP blocking
   - Math question challenge
5. Shows error messages if validation fails
6. Prevents form submission until validation passes

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with Marketo form

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Form Validation] v7.3.1`
   - Verify "Form Validation Script Initialized" message

3. **Test Name Validation (if enabled):**
   - Set first name and last name to the same value
   - Try to submit form
   - Verify error message: "First Name and Last Name cannot be the same"
   - Form should not submit

4. **Test Default Name Prevention (if enabled):**
   - Enter "first" in first name field
   - Try to submit form
   - Verify error message about containing "first"
   - Form should not submit

5. **Test EDU Email Validation (if enabled):**
   - Enter non-.edu email address
   - Try to submit form
   - Verify error message: "Email must be a .edu address"
   - Form should not submit

6. **Test Math Question (if enabled):**
   - Verify math question field appears on form
   - Select wrong answer
   - Try to submit form
   - Verify error message about math question
   - Select correct answer
   - Form should submit successfully

#### Troubleshooting

**Issue:** Validation not running  
**Solution:**
- Verify Marketo Forms2 is loaded
- Check console for form detection messages
- Verify form is not a hidden conversion form (those are skipped)

**Issue:** Math question not appearing  
**Solution:**
- Verify `formMathValidation: 'true'` in 3E Config
- Check console for math question creation messages
- Verify form has space for additional field

**Issue:** Validation blocking legitimate submissions  
**Solution:**
- Check 3E Config settings for validation toggles
- Verify IP blocking list doesn't include legitimate IPs
- Test with different email addresses/names

---

### 3E_RFI Submit

**File Location:** `tags/base-solutions/3E_RFI Submit.html`  
**Version:** 1.4.5  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Forms2

#### What It Does

Handles form submissions from Marketo forms and 123FormBuilder forms. When a form is submitted successfully, it pushes an `rfi_submission` event to the dataLayer, which can trigger other tags or tracking. It also manages redirects to thank you pages.

**Important:** This tag skips hidden conversion forms (chatbot blind forms) to prevent duplicate events. Hidden forms are handled by the 3E_3EI Recruiter Conversion script.

#### How It Works

**For Marketo Forms:**
1. Script waits for Marketo Forms2 to load
2. Finds Marketo forms on the page
3. Checks if form is a hidden conversion form (skips if yes)
4. Listens for form submission success
5. When form submits successfully:
   - Pushes `rfi_submission` event to dataLayer
   - Handles redirect to thank you page
   - Prevents default Marketo redirect behavior

**For 123FormBuilder Forms:**
1. Script searches for 123FormBuilder form elements (IDs starting with `cf_`)
2. Listens for form success events
3. Also monitors iframe src changes for thank you page patterns
4. Listens for postMessage events from 123FormBuilder iframes
5. When form submits successfully:
   - Detects submission via scrollToTop postMessage or URL change
   - Pushes `rfi_submission` event to dataLayer

#### Validation Process

**Scenario 1: Visible Marketo Form Submission**

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with Marketo form

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_RFI Submit] v1.4.5`
   - Verify "Marketo form detected and ready" message

3. **Submit Form:**
   - Fill out Marketo form completely
   - Submit form
   - Check console for: `[3E_RFI Submit] Pushed rfi_submission event to dataLayer`

4. **Verify dataLayer Event:**
   - Open browser console
   - Type: `dataLayer`
   - Look for event object: `{event: 'rfi_submission'}`
   - Verify event was pushed

5. **Verify Redirect:**
   - Check that page redirects to thank you page
   - Verify redirect happens correctly

**Scenario 2: 123FormBuilder Form Submission**

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Add `?3e_rfi_debug=true` to URL for enhanced logging
   - Reload page with 123FormBuilder form

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_RFI Submit] v1.4.5`
   - Verify "Found X potential 123FormBuilder form(s)" message

3. **Submit Form:**
   - Fill out 123FormBuilder form completely
   - Submit form
   - Check console for scrollToTop postMessage detection or URL change detection
   - Look for: `[3E_RFI Submit] Received scrollToTop postMessage` or `[3E_RFI Submit] Thank you page pattern detected`

4. **Verify dataLayer Event:**
   - Open browser console
   - Type: `dataLayer`
   - Look for event object: `{event: 'rfi_submission'}`
   - Verify event was pushed

**Scenario 3: Chatbot Blind Form Submission (Should Be Skipped)**

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with chatbot

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_RFI Submit] v1.4.5`
   - Verify "Marketo form detected and ready" message

3. **Submit Chatbot Blind Form:**
   - Interact with chatbot
   - Submit blind form through chatbot
   - Check console for: `[3E_RFI Submit] Skipping hidden conversion form - handled by chatbot conversion script`
   - Verify 3E_RFI Submit does NOT push rfi_submission event

4. **Verify Only One Event:**
   - Check dataLayer for rfi_submission events
   - Should see only ONE event (from 3E_3EI Recruiter Conversion script)
   - Should NOT see duplicate events

#### Troubleshooting

**Issue:** Marketo form submission not triggering event  
**Solution:**
- Verify Marketo Forms2 is loaded
- Check console for form detection messages
- Verify form is not a hidden conversion form
- Check for hardcoded RFI submit scripts (may conflict)

**Issue:** 123FormBuilder form not detected  
**Solution:**
- Verify form has ID starting with `cf_`
- Check console for form detection attempts
- Verify form is loaded before script runs
- Try adding `?3e_rfi_debug=true` to URL for enhanced logging

**Issue:** Duplicate rfi_submission events  
**Solution:**
- Verify hidden conversion forms are being skipped (check console logs)
- Check that 3E_3EI Recruiter Conversion script is handling blind forms
- Verify only one script handles each form type

**Issue:** Event not appearing in dataLayer  
**Solution:**
- Verify dataLayer exists: `window.dataLayer = window.dataLayer || []`
- Check console for push confirmation messages
- Verify no JavaScript errors preventing execution

---

### 3E_Favicon Injection

**File Location:** `tags/base-solutions/3E_Favicon Injection.html`  
**Version:** 1.2.1  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Dynamically changes the website's favicon (the small icon in the browser tab) based on settings in 3E Config. If no favicon URL is configured, it preserves the existing favicon.

#### How It Works

1. Script loads when page loads
2. Checks if page should run (Marketo landing page or 3enrollment domain)
3. Checks if favicon URL is provided in 3E Config
4. If favicon URL is provided:
   - Removes existing favicon links
   - Creates new favicon links pointing to configured URL
   - Injects links into page head
5. If no favicon URL is provided:
   - Preserves existing favicons (does not remove them)

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Favicon Injection] v1.2.1`
   - Verify "3E Favicon Injection Script Initialized" message

3. **Test With Favicon URL Configured:**
   - Set `faviconUrl` in 3E Config to a valid image URL
   - Reload page
   - Check browser tab for new favicon
   - Check console for: `[3E Favicon Injection] Favicon injected: [URL]`
   - Inspect page source: Look for `<link rel="icon">` tags in `<head>`

4. **Test Without Favicon URL:**
   - Remove or empty `faviconUrl` in 3E Config
   - Reload page
   - Check console for: `[3E Favicon Injection] No favicon URL provided - preserving existing favicons`
   - Verify existing favicon remains unchanged

#### Troubleshooting

**Issue:** Favicon not changing  
**Solution:**
- Verify `faviconUrl` is set in 3E Config
- Check that URL is accessible (not broken)
- Verify page targeting (must be Marketo landing page or 3enrollment domain)
- Check console for injection messages

**Issue:** Favicon removed when not configured  
**Solution:**
- Verify script version is 1.2.1 or later (preserves existing favicons)
- Check that `faviconUrl` is empty/not set in 3E Config
- Verify console shows "preserving existing favicons" message

**Issue:** Favicon not showing  
**Solution:**
- Verify favicon URL is valid and accessible
- Check image format (should be .ico, .png, or .svg)
- Clear browser cache and reload
- Check browser tab (some browsers cache favicons aggressively)

---

### 3E_Sticky Buttons

**File Location:** `tags/base-solutions/3E_Sticky Buttons.html`  
**Version:** 1.2.4  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Creates sticky (always visible) buttons on mobile devices that stay at the bottom of the screen when scrolling. These buttons typically include "Apply Now" and "Request Info" CTAs. On mobile, the buttons stick to the bottom of the viewport. The script also creates a container for the chatbot iframe to be placed in.

#### How It Works

1. Script loads when page loads
2. Checks if page should run (Marketo landing page or 3enrollment domain)
3. Detects mobile viewport (width < 576px)
4. Finds header elements with sticky button classes (`.hdr_right_v2`)
5. Applies sticky positioning to header on mobile
6. Creates chatbot iframe container in sticky header (for chatbot integration)
7. Adjusts button spacing and styling to match existing buttons

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Sticky Buttons] v1.2.4`
   - Verify "3E Sticky Buttons Script Initialized" message

3. **Test on Mobile Viewport:**
   - Resize browser to mobile width (< 576px) or use device emulation
   - Scroll page down
   - Verify buttons stick to bottom of screen
   - Check console for sticky button detection messages

4. **Test on Desktop:**
   - Resize browser to desktop width (> 576px)
   - Verify buttons do NOT stick (normal positioning)
   - Check console for appropriate messages

5. **Verify Chatbot Container:**
   - On mobile viewport, inspect page
   - Look for element with ID `chatbot-iframe-container`
   - Verify container is created in sticky header
   - Check console for container creation messages

#### Troubleshooting

**Issue:** Buttons not sticking on mobile  
**Solution:**
- Verify viewport width is < 576px
- Check that header element exists (`.hdr_right_v2`)
- Verify page targeting (must be Marketo landing page or 3enrollment domain)
- Check console for sticky button detection messages

**Issue:** Buttons sticking on desktop  
**Solution:**
- Verify viewport width is > 576px
- Check that sticky positioning is only applied on mobile
- Verify breakpoint logic in script

**Issue:** Chatbot container not created  
**Solution:**
- Verify mobile viewport (< 576px)
- Check that sticky header element exists
- Verify script version is 1.2.4 or later
- Check console for container creation messages

---

### 3E_Cloudflare Beacon

**File Location:** `tags/base-solutions/3E_Cloudflare Beacon.html`  
**Version:** 1.2.0  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Integrates Cloudflare Web Analytics tracking on the website. This provides website analytics data through Cloudflare's analytics platform.

#### How It Works

1. Script loads when page loads
2. Checks if Cloudflare token is provided in 3E Config
3. If token is provided:
   - Loads Cloudflare Web Analytics script
   - Initializes tracking with provided token
4. If no token is provided:
   - Script does nothing (skips initialization)

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Cloudflare Beacon] v1.2.0`
   - Verify script initialization message

3. **Test With Token Configured:**
   - Set `cloudflareToken` in 3E Config
   - Reload page
   - Check console for Cloudflare script loading messages
   - Verify Cloudflare analytics script is loaded (inspect Network tab)
   - Check Cloudflare dashboard for tracking data

4. **Test Without Token:**
   - Remove or empty `cloudflareToken` in 3E Config
   - Reload page
   - Verify script skips initialization
   - Check console for appropriate messages

#### Troubleshooting

**Issue:** Cloudflare tracking not working  
**Solution:**
- Verify `cloudflareToken` is set in 3E Config
- Check that token is valid and active
- Verify Cloudflare script is loading (check Network tab)
- Check Cloudflare dashboard for data

**Issue:** Script not loading  
**Solution:**
- Verify 3E Config is loaded
- Check console for initialization messages
- Verify no JavaScript errors

---

## Chatbot Solutions

Chatbot solutions provide integration and tracking for chatbot/recruiter functionality. Deploy these when implementing chatbot solutions.

---

### 3E_3EI Recruiter Activity

**File Location:** `tags/chatbot-solutions/3E_3EI Recruiter Activity.html`  
**Version:** 1.1.9  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Listens for activity signals from the chatbot iframe and pushes events to the dataLayer. This tracks when users interact with the chatbot (open, respond, click links, close, etc.).

#### How It Works

1. Script loads when page loads
2. Sets up a listener for postMessage events from chatbot iframe
3. Validates message origin (security check)
4. When chatbot sends activity signals:
   - Receives postMessage with activity type
   - Pushes corresponding event to dataLayer
   - Events include: `bot_initiated`, `bot_response`, `bot_click_link`, `bot_click_app_link`, `bot_engagement`, `bot_closed`, `bot_email_captured`

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with chatbot

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_3EI Recruiter Activity] v1.1.9`
   - Verify script initialization message

3. **Test Bot Initiated:**
   - Open chatbot
   - Check console for: `[3E_3EI Recruiter Activity] bot_initiated event received`
   - Verify dataLayer event: `{event: 'bot_initiated'}`

4. **Test Bot Response:**
   - Send a message in chatbot
   - Check console for bot_response events
   - Verify dataLayer events

5. **Test Bot Closed:**
   - Close chatbot
   - Check console for: `[3E_3EI Recruiter Activity] bot_closed event received`
   - Verify dataLayer event: `{event: 'bot_closed'}`

#### Troubleshooting

**Issue:** No activity events firing  
**Solution:**
- Verify chatbot iframe is loaded
- Check that chatbot is sending postMessage events
- Verify origin validation (check console for rejected messages)
- Check console for postMessage listener setup messages

**Issue:** Events not appearing in dataLayer  
**Solution:**
- Verify dataLayer exists
- Check console for event push confirmations
- Verify no JavaScript errors

---

### 3E_3EI Recruiter Conversion

**File Location:** `tags/chatbot-solutions/3E_3EI Recruiter Conversion.html`  
**Version:** 2.2.4  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Forms2

#### What It Does

Handles chatbot conversion form submissions. When a user submits information through the chatbot (blind form), this script submits the data to Marketo and pushes an `rfi_submission` event to the dataLayer. This is the ONLY script that should handle hidden conversion forms.

#### How It Works

1. Script loads when page loads
2. Waits for Marketo Forms2 to load
3. Finds hidden conversion forms (marked with data attributes or in hidden container)
4. Sets up form submission handler
5. When form submits:
   - Submits data to Marketo
   - Pushes `rfi_submission` event to dataLayer
   - Prevents page navigation (keeps user on page)

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with chatbot

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_3EI Recruiter Conversion] v2.2.4`
   - Verify script initialization message

3. **Test Hidden Form Detection:**
   - Interact with chatbot to trigger blind form
   - Check console for hidden form detection messages
   - Verify form is marked with data attributes

4. **Test Form Submission:**
   - Fill out blind form through chatbot
   - Submit form
   - Check console for: `[3E_3EI Recruiter Conversion] Form submitted successfully`
   - Verify dataLayer event: `{event: 'rfi_submission'}`
   - Verify only ONE rfi_submission event (not duplicate from 3E_RFI Submit)

5. **Verify Marketo Submission:**
   - Check Marketo activity log for form submission
   - Verify data was submitted correctly

#### Troubleshooting

**Issue:** Hidden form not detected  
**Solution:**
- Verify form has data attributes: `data-mkto-form-purpose="hidden-conversion"` or `data-mkto-form-type="hidden-conversion"`
- Check that form is in container with ID `mkto-hidden-form-conversion`
- Check console for form detection messages

**Issue:** Duplicate rfi_submission events  
**Solution:**
- Verify 3E_RFI Submit is skipping hidden forms (check console logs)
- Check that only 3E_3EI Recruiter Conversion handles hidden forms
- Verify form is properly marked as hidden conversion form

**Issue:** Form not submitting to Marketo  
**Solution:**
- Verify Marketo Forms2 is loaded
- Check Marketo form ID in 3E Config matches form
- Check console for submission errors
- Verify Marketo API permissions

---

### 3E_3EI Recruiter Tracking

**File Location:** `tags/chatbot-solutions/3E_3EI Recruiter Tracking.html`  
**Version:** 2.1.4  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Munchkin

#### What It Does

Sends chatbot events to Marketo via Munchkin tracking. When chatbot events occur (initiated, closed, etc.), this script sends tracking data to Marketo to record the activity.

#### How It Works

1. Script loads when page loads
2. Waits for Marketo Munchkin to be available
3. Listens for chatbot events in dataLayer
4. When chatbot events occur:
   - Captures event data
   - Sends tracking data to Marketo via Munchkin
   - Records activity in Marketo

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with chatbot

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_3EI Recruiter Tracking] v2.1.4`
   - Verify script initialization message

3. **Test Bot Initiated Tracking:**
   - Open chatbot
   - Check console for tracking messages
   - Verify Marketo receives tracking data (check Marketo activity log)

4. **Test Bot Closed Tracking:**
   - Close chatbot
   - Check console for tracking messages
   - Verify Marketo receives tracking data

#### Troubleshooting

**Issue:** Tracking not sending to Marketo  
**Solution:**
- Verify Marketo Munchkin is loaded
- Check Munchkin ID in 3E Config matches Marketo instance
- Verify chatbot events are firing (check dataLayer)
- Check console for tracking errors

**Issue:** Events not appearing in Marketo  
**Solution:**
- Verify Munchkin is initialized correctly
- Check Marketo activity log for tracking data
- Verify event data is being sent
- Check for JavaScript errors

---

### 3E_3EI Recruiter Unified

**File Location:** `tags/chatbot-solutions/3E_3EI Recruiter Unified.html`  
**Version:** 1.4.4  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Loads the chatbot iframe on the page. It can load either a development or production chatbot based on 3E Config settings. The chatbot appears as a floating widget, and on mobile it can be integrated into the sticky button bar.

#### How It Works

1. Script loads when page loads
2. Checks chatbot environment setting in 3E Config (disabled/dev/prod)
3. If disabled, script exits
4. If dev or prod:
   - Gets chatbot ID from 3E Config
   - Creates iframe element
   - Sets iframe source to chatbot URL
   - Places iframe in sticky container (if available) or fixed position
   - Sets up postMessage communication with iframe
   - Handles iframe expansion/collapse based on chatbot state

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Set `chatBotEnvironment: 'prod'` or `'dev'` in 3E Config
   - Set `chatBotProdId` or `chatBotDevId` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_ChatBot Unified] v1.4.4`
   - Verify chatbot environment and bot ID

3. **Test Desktop Chatbot:**
   - Verify chatbot iframe appears (usually bottom-right)
   - Check that iframe loads chatbot content
   - Click chatbot to open
   - Verify chatbot expands to full screen
   - Close chatbot
   - Verify chatbot collapses

4. **Test Mobile Chatbot:**
   - Resize to mobile viewport (< 576px)
   - Verify chatbot appears in sticky button bar
   - Check that chatbot container is created
   - Click chatbot
   - Verify chatbot expands to full screen
   - Close chatbot
   - Verify chatbot collapses to compact view

5. **Test Environment Control:**
   - Set `chatBotEnvironment: 'disabled'` in 3E Config
   - Reload page
   - Verify chatbot does NOT appear
   - Check console for disabled message

#### Troubleshooting

**Issue:** Chatbot not appearing  
**Solution:**
- Verify `chatBotEnvironment` is set to 'dev' or 'prod' (not 'disabled')
- Check that `chatBotProdId` or `chatBotDevId` is set in 3E Config
- Verify bot ID is valid
- Check console for initialization errors

**Issue:** Chatbot not expanding on mobile  
**Solution:**
- Verify sticky button container exists
- Check that 3E_Sticky Buttons script is deployed
- Verify chatbot container is created
- Check console for expansion messages

**Issue:** Chatbot iframe not loading  
**Solution:**
- Verify chatbot URL is accessible
- Check bot ID is correct
- Verify iframe is created (inspect page)
- Check console for iframe creation messages

---

### 3E_Insights Pixel

**File Location:** `tags/chatbot-solutions/3E_Insights Pixel.html`  
**Version:** 1.0.7  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Loads Marketo Munchkin tracking script and Insights pixel for analytics. This ensures Marketo tracking is available even if Munchkin isn't loaded elsewhere on the page.

#### How It Works

1. Script loads when page loads
2. Checks if Marketo Munchkin is already loaded
3. If not loaded:
   - Loads Munchkin script from Marketo
   - Initializes Munchkin with ID from 3E Config
4. Loads Insights pixel for analytics
5. Ensures tracking is available for other tags

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Insights Pixel] v1.0.7`
   - Verify script initialization message

3. **Test Munchkin Loading:**
   - Check Network tab for Munchkin script request
   - Verify Munchkin script loads
   - Check console for Munchkin initialization messages
   - Verify `window.Munchkin` object exists

4. **Test Insights Pixel:**
   - Check Network tab for Insights pixel request
   - Verify pixel loads correctly

#### Troubleshooting

**Issue:** Munchkin not loading  
**Solution:**
- Verify `munchkinId` is set in 3E Config
- Check that Munchkin ID is valid
- Verify Marketo instance URL is correct
- Check console for loading errors

**Issue:** Duplicate Munchkin loading  
**Solution:**
- Check if Munchkin is loaded elsewhere on page
- Verify script checks for existing Munchkin before loading
- Check console for duplicate loading messages

---

## Pop-up Solutions

Pop-up solutions provide pop-up functionality and tracking. Deploy these when implementing pop-up solutions.

---

### 3E_Pop-up

**File Location:** `tags/pop-up-solutions/3E_Pop-up.html`  
**Version:** 2.3.1  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config

#### What It Does

Injects a vendor pop-up snippet (like Pardot, OptinMonster, etc.) into the page. The pop-up code is stored in 3E Config, and this script injects it when enabled.

#### How It Works

1. Script loads when page loads
2. Checks if pop-up is enabled in 3E Config (`popupEnvironment: 'enabled'`)
3. Checks if pop-up snippet exists in 3E Config (`popupTag`)
4. If enabled and snippet exists:
   - Creates container div
   - Injects pop-up snippet HTML
   - Executes any script tags in snippet
   - Marks as injected to prevent duplicates
5. If disabled or no snippet:
   - Script does nothing

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Set `popupEnvironment: 'enabled'` in 3E Config
   - Set `popupTag` in 3E Config with pop-up snippet
   - Reload page

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for: `[3E_Pop-up] v2.3.1`
   - Verify script initialization message

3. **Test Pop-up Injection:**
   - Verify pop-up appears on page
   - Check console for injection messages
   - Inspect page source: Look for pop-up markup
   - Verify pop-up functionality works

4. **Test Disabled State:**
   - Set `popupEnvironment: 'disabled'` in 3E Config
   - Reload page
   - Verify pop-up does NOT appear
   - Check console for disabled message

#### Troubleshooting

**Issue:** Pop-up not appearing  
**Solution:**
- Verify `popupEnvironment: 'enabled'` in 3E Config
- Check that `popupTag` contains valid pop-up snippet
- Verify pop-up snippet is correct format
- Check console for injection messages

**Issue:** Pop-up appearing multiple times  
**Solution:**
- Verify script version is 2.3.1 or later (has duplicate prevention)
- Check that `window.__3E_POPUP_INJECTED__` flag is set
- Check console for duplicate prevention messages

**Issue:** Pop-up scripts not executing  
**Solution:**
- Verify pop-up snippet contains valid script tags
- Check console for script execution errors
- Verify scripts are being extracted and executed correctly

---

### 3E_Pop-up Marketo Form

**File Location:** `tags/pop-up-solutions/3E_Pop-up Marketo Form.html`  
**Version:** 1.2.3  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Forms2

#### What It Does

Integrates Marketo forms into pop-ups. When a pop-up displays, it can contain a Marketo form for lead capture.

#### How It Works

1. Script loads when page loads
2. Waits for Marketo Forms2 to load
3. Finds Marketo forms within pop-up containers
4. Sets up form handling for pop-up forms
5. Manages form display and submission within pop-up context

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with pop-up containing Marketo form

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for script initialization message
   - Verify Marketo Forms2 detection

3. **Test Form in Pop-up:**
   - Trigger pop-up display
   - Verify Marketo form appears in pop-up
   - Fill out form
   - Submit form
   - Verify form submission works correctly

#### Troubleshooting

**Issue:** Form not appearing in pop-up  
**Solution:**
- Verify Marketo Forms2 is loaded
- Check that form is configured in pop-up
- Verify pop-up is displaying correctly
- Check console for form detection messages

**Issue:** Form submission not working  
**Solution:**
- Verify Marketo Forms2 is loaded
- Check form configuration
- Verify form submission handler is set up
- Check console for submission errors

---

### 3E_Pop-up Tracking

**File Location:** `tags/pop-up-solutions/3E_Pop-up Tracking.html`  
**Version:** 2.3.2  
**Type:** Custom HTML Tag  
**Dependencies:** 3E Config, Marketo Munchkin

#### What It Does

Tracks pop-up events (display, close, interaction) and sends tracking data to Marketo via Munchkin. This helps measure pop-up effectiveness and user engagement.

#### How It Works

1. Script loads when page loads
2. Waits for Marketo Munchkin to be available
3. Listens for pop-up events (display, close, form submission)
4. When pop-up events occur:
   - Captures event data
   - Sends tracking data to Marketo via Munchkin
   - Records activity in Marketo

#### Validation Process

1. **Enable Debug Mode:**
   - Set `debugMode: 'true'` in 3E Config
   - Reload page with pop-up

2. **Check Console Logs:**
   - Open browser console (F12)
   - Look for script initialization message
   - Verify Marketo Munchkin detection

3. **Test Pop-up Display Tracking:**
   - Trigger pop-up display
   - Check console for tracking messages
   - Verify Marketo receives tracking data

4. **Test Pop-up Close Tracking:**
   - Close pop-up
   - Check console for tracking messages
   - Verify Marketo receives tracking data

#### Troubleshooting

**Issue:** Tracking not sending to Marketo  
**Solution:**
- Verify Marketo Munchkin is loaded
   - Check Munchkin ID in 3E Config
   - Verify pop-up events are firing
   - Check console for tracking errors

**Issue:** Events not appearing in Marketo  
**Solution:**
- Verify Munchkin is initialized correctly
- Check Marketo activity log for tracking data
- Verify event data is being sent
- Check for JavaScript errors

---

## General Troubleshooting

### Common Issues Across All Tags

#### Issue: Script Not Loading

**Symptoms:**
- No console logs from script
- Functionality not working

**Solutions:**
1. Verify tag is published in GTM container
2. Check tag trigger conditions (Page View, DOM Ready, etc.)
3. Verify 3E Config variable is set up
4. Check browser console for JavaScript errors
5. Verify tag is not blocked by ad blockers or privacy tools

#### Issue: 3E Config Not Loading

**Symptoms:**
- Console shows "Failed to load 3E config" errors
- Tags not initializing

**Solutions:**
1. Verify 3E Config variable is created in GTM
2. Check variable name matches exactly (case-sensitive: "3E config")
3. Ensure variable is published
4. Verify variable configuration is valid JSON
5. Check for typos in variable reference: `{{3E config}}`

#### Issue: Debug Mode Not Working

**Symptoms:**
- No console logs appearing
- Can't see what script is doing

**Solutions:**
1. Verify `debugMode: 'true'` in 3E Config (string 'true', not boolean)
2. Clear browser cache and reload
3. Check browser console is open (F12)
4. Verify no console filters are hiding messages
5. Check that script version supports debug mode

#### Issue: Duplicate Events

**Symptoms:**
- Same event firing multiple times
- DataLayer has duplicate entries

**Solutions:**
1. Check for duplicate tag deployments in GTM
2. Verify only one script handles each event type
3. Check for hardcoded scripts that might conflict
4. Review tag firing conditions (may be firing multiple times)
5. Use debug mode to identify which script is firing events

#### Issue: Events Not Appearing in dataLayer

**Symptoms:**
- Script runs but events don't appear in dataLayer
- GTM triggers not firing

**Solutions:**
1. Verify dataLayer exists: `window.dataLayer = window.dataLayer || []`
2. Check console for event push confirmations
3. Verify event format is correct: `{event: 'event_name'}`
4. Check GTM Preview mode to see dataLayer events
5. Verify no JavaScript errors preventing execution

### Browser Compatibility Issues

**Symptoms:**
- Script works in some browsers but not others
- Console shows compatibility errors

**Solutions:**
1. Check browser console for specific error messages
2. Verify browser supports required features (ES5+)
3. Test in multiple browsers (Chrome, Firefox, Safari, Edge)
4. Check for polyfills if using newer JavaScript features
5. Verify no browser extensions interfering

### Performance Issues

**Symptoms:**
- Page loads slowly
- Scripts taking long to initialize

**Solutions:**
1. Check Network tab for slow script loading
2. Verify scripts are not blocking page render
3. Check for excessive console logging (disable in production)
4. Verify scripts are optimized and minified
5. Check for unnecessary script dependencies

---

## Debug Mode Usage

### Enabling Debug Mode

Debug mode provides detailed console logging for all tags. To enable:

1. **In 3E Config Variable:**
   - Set `debugMode: 'true'` (string value, not boolean)
   - Save and publish variable
   - Reload page

2. **For 3E_RFI Submit (Enhanced Debugging):**
   - Add `?3e_rfi_debug=true` to URL
   - This forces debug mode even if 3E Config has it disabled
   - Provides extra logging for form submission detection

### What Debug Mode Shows

When debug mode is enabled, you'll see:

- **Script Initialization:**
  - Script name and version
  - Configuration values
  - Initialization status

- **Event Tracking:**
  - When events are detected
  - Event data being sent
  - dataLayer push confirmations

- **Error Messages:**
  - Detailed error information
  - Stack traces for debugging
  - Failed operation details

- **State Changes:**
  - When scripts change state
  - Configuration updates
  - Feature toggles

### Console Log Examples

**Successful Initialization:**
```
[3E_RFI Submit] v1.4.5
[3E_RFI Submit] Marketo form detected and ready
```

**Event Detection:**
```
[3E_RFI Submit] Pushed rfi_submission event to dataLayer
[3E_3EI Recruiter Activity] bot_initiated event received
```

**Error Messages:**
```
[3E_RFI Submit] Error checking for hidden conversion form: [error details]
[3E Favicon Injection] Failed to load 3E config: [error details]
```

### Using Debug Mode for Validation

1. **Enable debug mode** in 3E Config
2. **Open browser console** (F12)
3. **Reload page** and watch for initialization messages
4. **Perform actions** (submit form, interact with chatbot, etc.)
5. **Check console** for expected log messages
6. **Verify events** in dataLayer
7. **Disable debug mode** before going to production

### Production Best Practices

- **Always disable debug mode** in production
- Set `debugMode: 'false'` in 3E Config for production
- Debug mode adds overhead and exposes internal details
- Use debug mode only for testing and troubleshooting

---

## Additional Resources

### Related Documentation

- **tags/README.md** - Quick reference for all tags
- **docs/GTM_TAG_UPDATER_SETUP.md** - How to update tags across containers
- **docs/GTM_TAG_UPDATER_QUICKSTART.md** - Quick start guide for tag updates

### Support Contacts

For issues or questions:
- Check this guide first
- Review tag file headers for version and date information
- Check browser console for error messages
- Review GTM Preview mode for tag firing information

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-12-17  
**Maintained By:** 3E Enrollment Development Team
