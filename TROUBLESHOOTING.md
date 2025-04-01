# OpenRouterChat Troubleshooting Guide

This guide provides solutions to common issues you might encounter while using or developing the OpenRouterChat application.

## Table of Contents
- [Rate Limiting](#rate-limiting)
- [Response Structure Errors](#response-structure-errors)
- [URL Management](#url-management)
- [Package Compatibility](#package-compatibility)
- [Text Formatting](#text-formatting)
- [General Performance and UX Improvements](#general-performance-and-ux-improvements)
- [Debugging Tips](#debugging-tips)

## Rate Limiting

### Issue
When using certain models (especially Google Gemini models), you may encounter HTTP 429 errors indicating you've reached a rate limit.

### Symptoms
- Error message: "Rate limit exceeded for Google AI: You exceeded your current quota..."
- Unable to send messages to certain models

### Solution
We implemented a model switching feature that appears when rate limits are encountered. This allows users to:
1. See a clear error message explaining the rate limit problem
2. Choose a different model to continue their conversation
3. Automatically create a new chat with the selected model

### Code Changes
- Enhanced error parsing in `api.ts` to identify provider-specific errors
- Added a `ModelSwitch` component for easy model selection
- Updated the `ChatScreen` to display model switching UI when rate limits occur

## Response Structure Errors

### Issue
Different AI providers return varying response structures, which can cause errors when parsing the results.

### Symptoms
- Error messages like "TypeError: Cannot convert undefined value to object"
- Inconsistent message display or empty responses

### Solution
- Added additional checks and optional chaining to handle different response structures
- Improved error messages to help diagnose specific issues
- Added comprehensive logging of API responses

### Code Changes
- Updated the `sendMessage` function in `api.ts` to safely handle various response structures
- Enhanced error handling to provide more descriptive error messages
- Added console logs at critical points to help debug API responses

## URL Management

### Issue
URLs were hardcoded throughout the application, making maintenance and updates difficult.

### Symptoms
- Multiple URL string duplications across files
- Difficulty updating API endpoints

### Solution
- Created a central URL constants file organized by type (API, web, image)
- Updated all components to use these constants

### Code Changes
- Added `URLS` object in `constants/index.ts`
- Refactored API service and components to use the centralized URLs
- Added documentation about URL management in the README

## Package Compatibility

### Issue
Several packages in the project are not compatible with the installed Expo version.

### Symptoms
- Warnings during app startup about package version mismatches
- Potential runtime issues or unexpected behavior

### Packages Requiring Updates
- `@react-native-async-storage/async-storage@2.1.2` (expected version: 1.23.1)
- `react-native-gesture-handler@2.25.0` (expected version: ~2.20.2)
- `react-native-reanimated@3.17.1` (expected version: ~3.16.1)
- `react-native-safe-area-context@5.3.0` (expected version: 4.12.0)
- `react-native-screens@4.10.0` (expected version: ~4.4.0)

### Solution
Run the following command to update to the compatible versions:
```
npm install @react-native-async-storage/async-storage@1.23.1 react-native-gesture-handler@~2.20.2 react-native-reanimated@~3.16.1 react-native-safe-area-context@4.12.0 react-native-screens@~4.4.0
```

## Text Formatting

### Issue
AI model responses often contain markdown-style formatting (like *bold*, _italic_, `code`, lists, etc.) that was displayed as plain text, making responses difficult to read.

### Symptoms
- Asterisks showing in text instead of bold formatting
- Code snippets without proper styling
- Bullet points showing as "- " instead of proper bullets

### Solution
We implemented a rich text formatting system that converts markdown-style syntax to properly formatted React Native text:

1. Created a `FormattedText` component that handles:
   - Bold text (`**bold**` or `__bold__`)
   - Italic text (`*italic*` or `_italic_`)
   - Inline code (`` `code` ``)
   - Multi-line code blocks with language detection and syntax highlighting (```python)
   - Bullet points (`- ` or `* `)
   - Numbered lists (`1. `, `2. `, etc.)
   - Links (`[text](url)`)

2. Updated the `MessageBubble` component to use `FormattedText` for AI responses

### Code Changes
- Added `FormattedText.tsx` component for rich text parsing and rendering
- Modified `MessageBubble.tsx` to use the new component for AI messages
- Added syntax highlighting for common programming languages in code blocks

### Usage Notes
The formatting is applied only to AI (assistant) messages, not user messages. Code blocks with language specifiers (e.g., ```python) get syntax highlighting for keywords, strings, and comments.

## General Performance and UX Improvements

### Improvements
1. **Error Handling**: Enhanced error messages with more user-friendly explanations
2. **Event System**: Created a centralized event system for managing global state changes
3. **Component Reusability**: Made components more modular and reusable
4. **API Key Management**: Improved the flow for managing API keys

### Code Changes
- Added an event emitter system in `utils/events.ts`
- Enhanced error alerts with options to take action
- Improved loading indicators and animations

## Debugging Tips

### API Response Issues
- Check the console logs for detailed API request and response information
- Look for "Response error data" logs which contain the detailed error from the provider
- When encountering new error types, add specific handling in the `getProviderErrorMessage` function

### Rate Limit Handling
- If you're frequently hitting rate limits, consider implementing a delay between requests
- Add support for more providers in the `getProviderErrorMessage` function

### UI Issues
- For layout problems, use the React Native Debugger to inspect the component hierarchy
- For text formatting issues, test with various markdown patterns to ensure proper rendering

## Markdown Formatting Issues

### Symptoms
- Formatting not rendering properly in messages
- Missing code syntax highlighting
- Duplicate key warnings in React components
- Nested formatting (like bold within lists) not working correctly

### Solution
We implemented a robust markdown formatting system that supports a wide range of formatting options. The following improvements were made:

1. Created a `FormattedText` component with recursive parsing for nested elements
2. Added proper key generation for React list items to avoid warnings
3. Implemented code syntax highlighting for multiple programming languages
4. Added support for block-level elements (headers, blockquotes, tables)
5. Enhanced text styling with proper nesting of formatting elements

### Code Changes
- Created a new `FormattedText.tsx` component with comprehensive markdown support
- Updated `MessageBubble.tsx` to use the new formatting component
- Added syntax highlighting for code blocks
- Implemented nested list rendering with proper indentation

This guide will be updated as new issues are identified and resolved. 