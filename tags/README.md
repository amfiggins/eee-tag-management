# 3E Tag Manager Scripts

Standard Google Tag Manager (GTM) tags for client deployment. All scripts are designed to work with Marketo, chatbots, popups, and form validation systems.

Tags are organized by **solution type** to match the folder structure used in GTM containers.

## Quick Reference

| Tag Name | Solution | Version | Last Updated | Dependencies |
|----------|----------|---------|--------------|--------------|
| **Template - 3E Config** | Base Solutions | 2.2 | 2025-01-27 | None |
| **3E_Analytics Tracking** | Base Solutions | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Page Activity** | Base Solutions | 1.3.1 | 2025-09-26 | 3E Config, Marketo Munchkin |
| **3E_Form Validation** | Base Solutions | 7.2.0 | 2025-10-28 | 3E Config |
| **3E_RFI Submit** | Base Solutions | 1.2.9 | 2025-10-29 | 3E Config, Marketo Forms2 |
| **3E_Favicon Injection** | Base Solutions | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Sticky Buttons** | Base Solutions | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_Cloudflare Beacon** | Base Solutions | 1.2.0 | 2025-10-03 | 3E Config |
| **3E_3EI Recruiter Activity** | Chatbot Solutions | 1.1.9 | 2025-09-26 | 3E Config |
| **3E_3EI Recruiter Conversion** | Chatbot Solutions | 2.2.4 | 2025-09-26 | 3E Config, Marketo Forms2 |
| **3E_3EI Recruiter Tracking** | Chatbot Solutions | 2.1.4 | 2025-09-26 | 3E Config, Marketo Munchkin |
| **3E_3EI Recruiter Unified** | Chatbot Solutions | 1.0.5 | 2025-09-26 | 3E Config |
| **3E_Insights Pixel** | Chatbot Solutions | 1.0.7 | 2025-09-26 | 3E Config |
| **3E_Pop-up** | Pop-up Solutions | 2.3.1 | 2025-11-17 | 3E Config |
| **3E_Pop-up Marketo Form** | Pop-up Solutions | 1.2.3 | 2025-09-26 | 3E Config, Marketo Forms2 |
| **3E_Pop-up Tracking** | Pop-up Solutions | 2.3.2 | 2025-09-26 | 3E Config, Marketo Munchkin |

---

## Solution Types

Tags are organized by solution type to match GTM container folder structure:

### 🏗️ Base Solutions (`base-solutions/`)
Core functionality tags that provide foundational features for all implementations.

**Tags:**
- **Template - 3E Config**: Central configuration hub (Variable Template)
- **3E_Analytics Tracking**: Comprehensive analytics tracking
- **3E_Page Activity**: Page engagement tracking
- **3E_Form Validation**: Advanced Marketo form validation
- **3E_RFI Submit**: Request for Information form submission
- **3E_Favicon Injection**: Dynamic favicon injection
- **3E_Sticky Buttons**: Mobile sticky button functionality
- **3E_Cloudflare Beacon**: Cloudflare Web Analytics integration

**Use Case**: Deploy these tags for all client implementations as they provide core functionality.

---

### 🤖 Chatbot Solutions (`chatbot-solutions/`)
Tags specifically for chatbot/recruiter integration and tracking.

**Tags:**
- **3E_3EI Recruiter Activity**: Captures chatbot activity signals
- **3E_3EI Recruiter Conversion**: Tracks chatbot conversions
- **3E_3EI Recruiter Tracking**: Marketo tracking for chatbot events
- **3E_3EI Recruiter Unified**: Unified chatbot integration
- **3E_Insights Pixel**: Insights pixel for chatbot analytics

**Use Case**: Deploy these tags when implementing chatbot/recruiter solutions.

---

### 🎯 Pop-up Solutions (`pop-up-solutions/`)
Tags for pop-up functionality and tracking.

**Tags:**
- **3E_Pop-up**: Main pop-up injection script
- **3E_Pop-up Marketo Form**: Pop-up with Marketo form integration
- **3E_Pop-up Tracking**: Pop-up event tracking

**Use Case**: Deploy these tags when implementing pop-up solutions.

---

## Common Dependencies

### 3E Config
Most tags depend on the **3E Config** variable template. This must be set up in GTM before deploying dependent tags. See `base-solutions/Template - 3E Config` for setup.

### Marketo Munchkin
Required for tags that send tracking data to Marketo. Ensure Munchkin is loaded or use `3E_Insights Pixel` to load it dynamically.

### Marketo Forms2
Required for tags that interact with Marketo forms. The Forms2 library is typically loaded by Marketo forms themselves.

---

## Detailed Tag Documentation

### Base Solutions

#### Template - 3E Config
**File**: `base-solutions/Template - 3E Config`  
**Version**: 2.2  
**Last Updated**: 2025-01-27  
**Type**: GTM Variable Template  
**Dependencies**: None

**Purpose**: Central configuration hub for all other scripts.

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

---

#### 3E_Analytics Tracking
**File**: `base-solutions/3E_Analytics Tracking.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Comprehensive analytics tracking including CTA click tracking, scroll depth tracking, form interaction tracking, video engagement tracking, and performance monitoring.

**Features**:
- CTA click tracking
- Scroll depth tracking
- Form interaction tracking
- Video engagement tracking
- Performance monitoring
- 3E Config integration

---

#### 3E_Page Activity
**File**: `base-solutions/3E_Page Activity`  
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

#### 3E_Form Validation
**File**: `base-solutions/3E_Form Validation`  
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

---

#### 3E_RFI Submit
**File**: `base-solutions/3E_RFI Submit`  
**Version**: 1.2.9  
**Last Updated**: 2025-10-29  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Handles Request for Information form submissions with Marketo integration.

**Features**:
- Marketo Forms2 integration
- Form submission handling
- Error handling and validation

---

#### 3E_Favicon Injection
**File**: `base-solutions/3E_Favicon Injection.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Dynamically injects favicon based on 3E Config settings.

**Features**:
- Dynamic favicon injection
- Configurable favicon URL
- 3E Config integration

---

#### 3E_Sticky Buttons
**File**: `base-solutions/3E_Sticky Buttons.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Mobile sticky button functionality for header CTAs.

**Features**:
- Responsive sticky buttons
- Mobile optimization
- Multiple button support

---

#### 3E_Cloudflare Beacon
**File**: `base-solutions/3E_Cloudflare Beacon.js`  
**Version**: 1.2.0  
**Last Updated**: 2025-10-03  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Cloudflare Web Analytics and performance monitoring integration.

**Features**:
- Cloudflare Web Analytics
- Performance monitoring
- Configurable token

---

### Chatbot Solutions

#### 3E_3EI Recruiter Activity
**File**: `chatbot-solutions/3E_3EI Recruiter Activity`  
**Version**: 1.1.9  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Captures 3EI Recruiter activity signals from iframe postMessage.

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
**File**: `chatbot-solutions/3E_3EI Recruiter Conversion`  
**Version**: 2.2.4  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Tracks chatbot conversions and submits to Marketo.

**Features**:
- Conversion tracking
- Marketo Forms2 integration
- Event handling

---

#### 3E_3EI Recruiter Tracking
**File**: `chatbot-solutions/3E_3EI Recruiter Tracking`  
**Version**: 2.1.4  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Munchkin

**Purpose**: Sends chatbot events to Marketo via Munchkin.

**Features**:
- Marketo Munchkin integration
- Event tracking
- Data layer integration

---

#### 3E_3EI Recruiter Unified
**File**: `chatbot-solutions/3E_3EI Recruiter Unified`  
**Version**: 1.0.5  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Unified chatbot integration with environment control.

**Features**:
- Environment control (dev/prod/disabled)
- Unified chatbot loading
- Configuration-based deployment

---

#### 3E_Insights Pixel
**File**: `chatbot-solutions/3E_Insights Pixel`  
**Version**: 1.0.7  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Insights pixel for chatbot analytics and Marketo Munchkin loading.

**Features**:
- Insights pixel integration
- Marketo Munchkin loading
- Analytics tracking

---

### Pop-up Solutions

#### 3E_Pop-up
**File**: `pop-up-solutions/3E_Pop-up`  
**Version**: 2.3.1  
**Last Updated**: 2025-11-17  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config

**Purpose**: Injects vendor popup snippet from 3E config (popupTag). Skips if disabled, absent or already injected.

**Features**:
- Vendor popup injection
- Duplicate prevention
- Config-based control

---

#### 3E_Pop-up Marketo Form
**File**: `pop-up-solutions/3E_Pop-up Marketo Form`  
**Version**: 1.2.3  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Forms2

**Purpose**: Pop-up with Marketo form integration.

**Features**:
- Marketo Forms2 integration
- Pop-up display
- Form handling

---

#### 3E_Pop-up Tracking
**File**: `pop-up-solutions/3E_Pop-up Tracking`  
**Version**: 2.3.2  
**Last Updated**: 2025-09-26  
**Type**: Custom HTML Tag  
**Dependencies**: 3E Config, Marketo Munchkin

**Purpose**: Tracks pop-up events and sends to Marketo.

**Features**:
- Pop-up event tracking
- Marketo Munchkin integration
- Event data collection

---

## Version Management

- Tag versions are tracked in file headers
- Use automation tools to push updates across containers
- Always test with `--list-only` or `--dry-run` before deploying
- Web interface shows version comparison automatically

---

## Contributing

1. Make changes to tag files
2. Update version numbers and dates in file headers
3. Test thoroughly
4. Commit and push to both remotes (3E GitHub and personal backup)
5. Use automation tools to deploy updates

---

## License

Internal use only - 3E Enrollment

---

## Maintainer

Anthony Figgins
