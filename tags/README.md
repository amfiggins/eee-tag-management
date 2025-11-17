# 3E Tag Manager Scripts

Standard Google Tag Manager (GTM) tags for client deployment. All scripts are designed to work with Marketo, chatbots, popups, and form validation systems.

## Quick Reference

| Tag Name | Category | Version | Last Updated | Dependencies |
|----------|----------|---------|--------------|--------------|
| **3E_Analytics Tracking** | Analytics | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Page Activity** | Analytics | 1.3.1 | 2025-09-26 | 3E Config, Marketo Munchkin |
| **3E_Form Validation** | Forms | 7.2.0 | 2025-10-28 | 3E Config |
| **3E_RFI Submit** | Forms | 1.2.9 | 2025-10-29 | 3E Config, Marketo Forms2 |
| **3E_3EI Recruiter Activity** | Tracking | 1.1.9 | 2025-09-26 | 3E Config |
| **3E_3EI Recruiter Conversion** | Tracking | 2.2.4 | 2025-09-26 | 3E Config, Marketo Forms2 |
| **3E_3EI Recruiter Tracking** | Tracking | 2.1.4 | 2025-09-26 | 3E Config, Marketo Munchkin |
| **3E_3EI Recruiter Unified** | Tracking | 1.0.5 | 2025-09-26 | 3E Config |
| **3E_Insights Pixel** | Tracking | 1.0.7 | 2025-09-26 | 3E Config |
| **3E_Pop-up Tracking** | Tracking | 2.3.2 | 2025-09-26 | 3E Config, Marketo Munchkin |
| **3E_Favicon Injection** | UI | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Pop-up** | UI | 2.3.1 | 2025-11-17 | 3E Config |
| **3E_Pop-up Marketo Form** | UI | 1.2.3 | 2025-09-26 | 3E Config, Marketo Forms2 |
| **3E_Sticky Buttons** | UI | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Cloudflare Beacon** | Integrations | 1.2.0 | 2025-10-03 | 3E Config |
| **Template - 3E Config** | Templates | 2.2 | 2025-01-27 | None |

---

## Tag Categories

### 📊 Analytics (`analytics/`)
Tags for tracking user behavior, engagement, and performance metrics.

### 📝 Forms (`forms/`)
Tags for form validation, submission handling, and form-related interactions.

### 📡 Tracking (`tracking/`)
Tags for tracking events, conversions, and integrating with third-party tracking systems.

### 🎨 UI (`ui/`)
Tags for user interface enhancements, popups, and visual elements.

### 🔌 Integrations (`integrations/`)
Tags for integrating with external services and platforms.

### 📋 Templates (`templates/`)
GTM variable templates for configuration management.

---

## Detailed Tag Documentation

### Analytics Tags

#### 3E_Analytics Tracking
**File**: `analytics/3E_Analytics Tracking.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Comprehensive analytics tracking including CTA click tracking, scroll depth tracking, form interaction tracking, video engagement tracking, and performance monitoring with 3E config integration.

**Features**:
- CTA click tracking
- Scroll depth tracking
- Form interaction tracking
- Video engagement tracking
- Performance monitoring
- 3E Config integration

---

#### 3E_Page Activity
**File**: `analytics/3E_Page Activity`  
**Version**: 1.3.1  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Munchkin

**Purpose**: Tracks page engagement by sending Marketo visits at configurable intervals.

**Features**:
- Configurable visit intervals
- Marketo Munchkin integration
- Page engagement tracking

---

### Form Tags

#### 3E_Form Validation
**File**: `forms/3E_Form Validation`  
**Version**: 7.2.0  
**Last Updated**: 2025-10-28  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Advanced Marketo form validation with 3E config integration, including name validation, EDU email validation, IP blocking, math questions, and comprehensive debugging.

**Features**:
- Duplicate name validation
- Default name prevention ("first", "last")
- EDU email validation
- IP address blocking
- Math question validation
- Dynamic CSS styling to match Marketo forms
- Comprehensive error handling
- 3E Config integration

---

#### 3E_RFI Submit
**File**: `forms/3E_RFI Submit`  
**Version**: 1.2.9  
**Last Updated**: 2025-10-29  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Handles Marketo RFI form submission, pushes event to dataLayer, and manages redirect.

**Features**:
- Marketo form submission handling
- dataLayer event pushing
- Redirect management
- 3E Config integration

---

### Tracking Tags

#### 3E_3EI Recruiter Activity
**File**: `tracking/3E_3EI Recruiter Activity`  
**Version**: 1.1.9  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Captures 3EI Recruiter activity signals from iframe postMessage and pushes them to the GTM dataLayer.

**Features**:
- postMessage event capture
- dataLayer integration
- Activity signal tracking

**Events Tracked**:
- `bot_initiated`
- `bot_response`
- `bot_click_link`
- `bot_click_app_link`
- `bot_engagement`
- `bot_closed`
- `bot_email_captured`

---

#### 3E_3EI Recruiter Conversion
**File**: `tracking/3E_3EI Recruiter Conversion`  
**Version**: 2.2.4  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Submits a hidden Marketo blind form on 3EI Recruiter email capture using 3E config; lazy-loads Forms2 and ensures tracking cookie.

**Features**:
- Hidden form submission
- Lazy-loads Marketo Forms2
- Tracking cookie management
- Email capture handling

---

#### 3E_3EI Recruiter Tracking
**File**: `tracking/3E_3EI Recruiter Tracking`  
**Version**: 2.1.4  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Munchkin

**Purpose**: Forwards 3EI Recruiter GTM events to Marketo Munchkin as visit/click activities.

**Features**:
- Event forwarding to Marketo
- Visit/click activity conversion
- Marketo Munchkin integration

---

#### 3E_3EI Recruiter Unified
**File**: `tracking/3E_3EI Recruiter Unified`  
**Version**: 1.0.5  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Unified 3EI Recruiter iframe loader that supports dev, prod, or disabled modes via 3E config.

**Features**:
- Environment-based configuration (disabled/dev/prod)
- Dynamic URL building
- Responsive sizing with mobile optimization
- Trusted origin validation
- Smooth reveal animations
- Enhanced debug logging

**Environment Modes**:
- `disabled`: No chatbot loads
- `dev`: Uses development environment and `chatBotDevId`
- `prod`: Uses production environment and `chatBotProdId`

---

#### 3E_Insights Pixel
**File**: `tracking/3E_Insights Pixel`  
**Version**: 1.0.7  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Loads Marketo Munchkin tracking dynamically via 3E config.

**Features**:
- Dynamic script loading
- Duplicate prevention
- Debug mode support
- Workspace info integration

---

#### 3E_Pop-up Tracking
**File**: `tracking/3E_Pop-up Tracking`  
**Version**: 2.3.2  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Munchkin

**Purpose**: Tracks Digioh popup interactions, enriches dataLayer events, and forwards activity to Marketo Munchkin.

**Features**:
- Popup interaction tracking
- dataLayer event enrichment
- Marketo Munchkin forwarding

---

### UI Tags

#### 3E_Favicon Injection
**File**: `ui/3E_Favicon Injection.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Dynamically injects favicon links into the page head with 3E config integration.

**Features**:
- Dynamic favicon injection
- 3E Config integration

---

#### 3E_Pop-up
**File**: `ui/3E_Pop-up`  
**Version**: 2.3.1  
**Last Updated**: 2025-11-17  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Injects vendor popup snippet from 3E config (popupTag). Skips if disabled, absent or already injected. Only appends DOM elements (not comments/whitespace).

**Features**:
- Vendor popup injection
- Disabled/enabled state management
- Duplicate prevention
- DOM element filtering (excludes comments/whitespace)

---

#### 3E_Pop-up Marketo Form
**File**: `ui/3E_Pop-up Marketo Form`  
**Version**: 1.2.3  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Dynamically loads a Marketo lead form into #mktoForm inside a Digioh popup.

**Features**:
- Dynamic form loading
- Digioh popup integration
- Marketo Forms2 integration

---

#### 3E_Sticky Buttons
**File**: `ui/3E_Sticky Buttons.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Handles mobile sticky button functionality for header CTAs with 3E config integration.

**Features**:
- Mobile sticky button functionality
- Header CTA handling
- 3E Config integration

---

### Integration Tags

#### 3E_Cloudflare Beacon
**File**: `integrations/3E_Cloudflare Beacon.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Cloudflare Web Analytics and performance monitoring with 3E config integration.

**Features**:
- Cloudflare Web Analytics integration
- Performance monitoring
- 3E Config integration

---

### Template Tags

#### Template - 3E Config
**File**: `templates/Template - 3E Config`  
**Version**: 2.2  
**Last Updated**: 2025-01-27  
**Type**: GTM Variable Template  
**Dependencies**: None

**Purpose**: Central configuration hub for all other scripts. This is a GTM Variable Template that provides centralized configuration.

**Configuration Options**:
- `baseUrl`: Marketo instance URL
- `munchkinId`: Marketo tracking ID
- `wsInfo`: Workspace information
- `debugMode`: Global debug toggle
- `blindFormId`: Hidden form for chatbot conversions
- `leadFormId`: Main lead capture form
- `chatBotProdId`: Production chatbot ID
- `chatBotDevId`: Development chatbot ID
- `chatBotEnvironment`: Chatbot environment control ('disabled', 'dev', 'prod')
- `popupTag`: Vendor popup snippet
- `faviconUrl`: Favicon URL for dynamic injection
- `cloudflareToken`: Cloudflare analytics token
- Form validation toggles (name, math, IP blocking, EDU validation)

**Usage**: This template should be created as a GTM Variable and referenced in other tags as `{{3E Config}}`.

---

## Common Dependencies

### 3E Config
Most tags depend on the **3E Config** variable template. This must be set up in GTM before deploying dependent tags.

### Marketo Munchkin
Required for tags that send tracking data to Marketo. Ensure Munchkin is loaded or use `3E_Insights Pixel` to load it dynamically.

### Marketo Forms2
Required for tags that interact with Marketo forms. The Forms2 library is typically loaded by Marketo forms themselves.

---

## Deployment

1. **Set up 3E Config variable** in GTM (if not already done)
2. **Copy tag code** from the appropriate file
3. **Create Custom HTML tag** in GTM
4. **Paste code** into the tag
5. **Configure triggers** as needed
6. **Test in Preview mode**
7. **Publish** when ready

## Version Management

Tag versions are tracked in the file headers. When updating tags:
1. Update the version number in the tag file
2. Update the "Date Updated" field
3. Document changes in commit messages
4. Use the automation tools to push updates across containers

## Support

For questions or issues:
- Check tag documentation above
- Review tag code comments
- See main project README for automation tools

