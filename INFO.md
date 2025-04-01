# OpenRouter Chat - Project Structure and Architecture

This document provides an in-depth explanation of the OpenRouter Chat project's structure, with descriptions of each directory and key files.

## Project Overview

OpenRouter Chat is a React Native mobile application built with Expo that provides a chat interface for interacting with various AI models through OpenRouter's API. The app follows a modular architecture with clear separation of concerns between UI components, business logic, and data services.

## Directory Structure

```
OpenRouterChat/
├── assets/                 # Static assets like images and icons
├── node_modules/           # Dependencies (generated folder)
├── src/                    # Source code for the application
│   ├── components/         # Reusable UI components
│   ├── constants/          # App-wide constants and configuration
│   ├── navigation/         # Navigation setup and routing
│   ├── screens/            # Screen components for each route
│   ├── services/           # API and business logic services
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions and helpers
├── .expo/                  # Expo configuration (generated folder)
├── .gitignore              # Git ignore configuration
├── app.json                # Expo application configuration
├── App.tsx                 # Root application component
├── babel.config.js         # Babel configuration
├── Explanation.md          # This document explaining the project structure
├── package.json            # Dependencies and scripts
├── README.md               # Project documentation and setup instructions
└── tsconfig.json           # TypeScript configuration
```

## Key Directories and Files Explained

### `/src/components/`

Contains reusable UI components used throughout the app:

- **MessageBubble.tsx**: Displays individual chat messages with styling based on sender (user or AI)
- **MessageInput.tsx**: Text input component with send button for composing messages
- **ChatListItem.tsx**: Individual item component used in the chat list
- **TypingIndicator.tsx**: Animated dots that display while waiting for a response from the AI

### `/src/constants/`

Contains app-wide constants and configuration:

- **index.ts**: Defines colors, API endpoints, default models, and other constant values used throughout the app

### `/src/navigation/`

Handles app navigation and routing:

- **index.tsx**: Implements the navigation stack using React Navigation, defining all available screens and navigation options

### `/src/screens/`

Contains the main screen components for the app:

- **ChatListScreen.tsx**: Displays the list of conversations and allows creating new ones
- **ChatScreen.tsx**: The main chat interface where messages are displayed and sent
- **ModelSelectionScreen.tsx**: Allows users to select AI models for new conversations
- **SettingsScreen.tsx**: Lets users configure the app, manage API keys, and clear chat history

### `/src/services/`

Contains business logic and API communication:

- **api.ts**: Handles communication with the OpenRouter API, including sending messages and fetching available models
- **storage.ts**: Manages local data persistence using AsyncStorage for chats and settings
- **settings.ts**: Handles user settings like API key management
- **events.ts**: Implements event emitter for communication between components

### `/src/types/`

Contains TypeScript type definitions:

- **index.ts**: Defines interfaces for Chat, Message, Model, and other data structures

### `/src/utils/`

Contains utility functions and helpers:

- **events.ts**: Implements a custom event emitter system for communication between components
- **formatters.ts**: Helper functions for text and date formatting

## Key Application Flows

### 1. Chat List Flow

1. App loads and displays the ChatListScreen
2. ChatListScreen retrieves saved chats from storage service
3. User can tap on a chat to navigate to ChatScreen with the selected chat
4. User can create a new chat by tapping the FAB button

### 2. New Chat Flow

1. User taps "+" on ChatListScreen
2. App navigates to ModelSelectionScreen
3. ModelSelectionScreen fetches available models from the OpenRouter API
4. User selects a model
5. App creates a new chat with the selected model and navigates to the ChatScreen

### 3. Chat Messaging Flow

1. ChatScreen loads the selected chat history
2. User types a message and taps send
3. Message is added to the chat history and displayed in the UI
4. App shows typing indicator while waiting for a response
5. API service sends the message to OpenRouter API
6. Response from the AI is added to the chat history and displayed
7. Chat is saved to local storage

### 4. Settings Management Flow

1. User accesses Settings from the header menu
2. SettingsScreen loads current settings from storage
3. User can enter/update their OpenRouter API key
4. Settings are saved to local storage
5. User can clear all chat history

### 5. API Key Management Flow

1. User navigates to the Settings screen via the gear icon in the header
2. If no API key is set, a warning banner is displayed in the ChatListScreen
3. In the Settings screen, user can:
   - Enter a new OpenRouter API key
   - Save the API key, which is securely stored in AsyncStorage
   - Clear the existing API key
   - Get a new API key by visiting the OpenRouter website
4. When the API key changes, an event is emitted to update all relevant screens
5. API requests automatically use the stored API key
6. If the API key is missing when trying to send a message, the user is prompted to add one

## Component Dependencies

- **ChatListScreen** depends on:
  - ChatListItem component
  - Storage service
  - Navigation
  - Event emitter

- **ChatScreen** depends on:
  - MessageBubble component
  - MessageInput component
  - TypingIndicator component
  - API service
  - Storage service
  - Navigation

- **ModelSelectionScreen** depends on:
  - API service
  - Event emitter
  - Navigation

- **SettingsScreen** depends on:
  - Storage service
  - Settings service
  - Navigation

## State Management

The app uses React's built-in state management with hooks:

- **Local Component State**: Used for UI state within components
- **Context API**: Not currently implemented, but could be added for global state if needed
- **AsyncStorage**: Used for persistent storage of chats and settings
- **Event Emitter**: Used for cross-component communication, including model selection and API key changes

## API Integration

The application integrates with the OpenRouter API through the `api.ts` service:

- **fetchModels()**: Retrieves available AI models from OpenRouter
- **sendMessage()**: Sends user messages to the selected AI model and returns responses
- **checkApiKey()**: Verifies if the API key is valid and set
- **refreshApiKey()**: Updates the API key used for requests
- **initializeApiKey()**: Loads the API key from storage when the app starts
- **getApiClient()**: Returns an Axios instance configured with the current API key

## Security Considerations

The application handles user data with security in mind:

1. **API Key Storage**: The OpenRouter API key is stored in AsyncStorage, which provides basic security for sensitive data
2. **No Server Storage**: All chat data is stored locally and not transmitted to any server except OpenRouter
3. **Secure API Requests**: HTTPS is used for all API communication
4. **Error Handling**: Error messages are designed to be informative without exposing sensitive information

## Styling Approach

The app uses React Native's StyleSheet API for styling, with a consistent color scheme defined in constants:

- **Theme Colors**: Primary, secondary, background, and accent colors defined in constants
- **Component-Specific Styles**: Each component has its own StyleSheet object
- **Responsive Design**: Components adapt to different screen sizes using flex layouts

## Future Enhancements

Potential areas for future development:

1. **State Management**: Implement Redux or Context API for more complex state management
2. **Offline Support**: Enhance offline capabilities with queue for pending messages
3. **Authentication**: Add user accounts for syncing chats across devices
4. **Themes**: Support light/dark mode and custom themes
5. **File Sharing**: Allow sending/receiving images and documents in chats
6. **Voice Input/Output**: Add speech-to-text and text-to-speech capabilities
7. **Extended Model Configuration**: Allow fine-tuning model parameters
8. **End-to-End Testing**: Add comprehensive testing suite

## Development Guidelines

When contributing to the project, follow these guidelines:

1. **Modular Development**: Keep components and services focused on a single responsibility
2. **Type Safety**: Use TypeScript interfaces and types for all data structures
3. **Error Handling**: Implement proper error handling at all levels
4. **Performance**: Be mindful of performance, especially with list rendering and animations
5. **Documentation**: Document code with comments explaining complex logic
6. **Testing**: Write unit tests for critical functionality
7. **Accessibility**: Ensure UI components are accessible to all users 