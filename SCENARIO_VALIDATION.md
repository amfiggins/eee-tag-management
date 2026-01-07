# 3E_RFI Submit - Scenario Validation

This document validates the expected behavior for all three form submission scenarios.

## Scenario 1: Visible Marketo Form Submission

### Expected Flow:
1. User fills out visible Marketo form on the page
2. User submits the form
3. Marketo validates the form
4. If validation passes, Marketo triggers `onSuccess` callback
5. `3E_RFI Submit` script (line 133) receives `onSuccess` event
6. Script checks `isHiddenConversionForm(form)` (line 135)
   - For visible forms: returns `false` (no hidden-conversion attributes, not in hidden container)
7. Script pushes `rfi_submission` event to dataLayer (line 145)
8. Script handles redirect if `followUpUrl` exists (lines 148-149)
9. Marketo completes its submission process

### Validation Status: ✅ CORRECT
- Visible Marketo forms have no `data-mkto-form-purpose="hidden-conversion"` attribute
- Visible Marketo forms are NOT in `#mkto-hidden-form-conversion` container
- `isHiddenConversionForm()` returns `false` for visible forms
- `rfi_submission` event fires correctly
- Redirect handling works as expected

---

## Scenario 2: 123FormBuilder Form Submission

### Expected Flow:
1. User fills out 123FormBuilder form (in iframe)
2. User submits the form
3. 123FormBuilder validates and processes the form
4. 123FormBuilder sends `scrollToTop` postMessage to parent page (line 236)
5. `3E_RFI Submit` script receives postMessage from trusted origin
6. Script checks `scrollToTopDetected` flag (line 236)
   - First time: flag is `false`, so proceeds
   - Sets `scrollToTopDetected = true` to prevent duplicates (line 237)
7. Script pushes `rfi_submission` event to dataLayer (line 241)
8. Script returns early (line 242) - no duplicate handling
9. If user lands on thank you page, `isThankYouPage()` check (line 281) prevents duplicate event

### Validation Status: ✅ CORRECT
- PostMessage detection works via `scrollToTop` message
- `scrollToTopDetected` flag prevents duplicate events
- Thank you page check prevents duplicate events on page reload
- `rfi_submission` event fires exactly once

---

## Scenario 3: Chatbot Blind Form Submission

### Expected Flow:

#### Part A: Chatbot Sends Event
1. User interacts with chatbot (in iframe)
2. User provides email address
3. Chatbot sends `bot_email_captured` event to parent page's dataLayer
4. Event includes email address in `details.email`

#### Part B: Blind Form Submission (3E_3EI Recruiter Conversion)
5. `3E_3EI Recruiter Conversion` script (line 66) detects `bot_email_captured` event
6. Script extracts email from event (line 71)
7. Script creates hidden container `#mkto-hidden-form-conversion` (line 85)
8. Script creates placeholder form with `data-mkto-form-purpose="hidden-conversion"` (line 196)
9. Script loads Marketo blind form into hidden container (line 218)
10. Script sets up `onSuccess` handler (line 284)
11. Script sets email value and submits form (lines 361, 432)
12. Marketo validates and processes the blind form
13. If validation passes, Marketo triggers `onSuccess` callback
14. `3E_3EI Recruiter Conversion` script receives `onSuccess` event (line 284)
15. Script pushes `rfi_submission` event to dataLayer with `source: 'chatbot_conversion'` (lines 299-304)
16. Script returns `false` to prevent redirect (line 321)

#### Part C: 3E_RFI Submit Skips Blind Form
17. `3E_RFI Submit` script ALSO receives `onSuccess` event (line 133) - Marketo fires for ALL forms
18. Script checks `isHiddenConversionForm(form)` (line 135)
19. Detection checks:
    - Line 86: Checks `data-mkto-form-purpose="hidden-conversion"` → ✅ MATCHES → Returns `true`
    - OR Line 96: Checks if form is in `#mkto-hidden-form-conversion` container → ✅ MATCHES → Returns `true`
20. Script returns early (line 141) - does NOT push `rfi_submission` event
21. Only `3E_3EI Recruiter Conversion` script pushes the event (no duplicate)

### Validation Status: ✅ CORRECT
- Chatbot blind form has `data-mkto-form-purpose="hidden-conversion"` attribute (set by conversion script)
- Chatbot blind form is inside `#mkto-hidden-form-conversion` container (created by conversion script)
- `isHiddenConversionForm()` correctly detects hidden conversion form (line 86 or 96/107)
- `3E_RFI Submit` skips hidden conversion forms (line 141)
- Only `3E_3EI Recruiter Conversion` pushes `rfi_submission` event
- No duplicate events occur

---

## Summary

| Scenario | Event Fires | Source | Duplicate Prevention |
|----------|-------------|--------|---------------------|
| Visible Marketo Form | ✅ Yes | `3E_RFI Submit` | N/A (single handler) |
| 123FormBuilder Form | ✅ Yes | `3E_RFI Submit` | `scrollToTopDetected` flag + thank you page check |
| Chatbot Blind Form | ✅ Yes | `3E_3EI Recruiter Conversion` | `isHiddenConversionForm()` detection in `3E_RFI Submit` |

All scenarios are correctly implemented and validated.
