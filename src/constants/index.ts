// API Constants
export const OPENROUTER_API_KEY = ''; // Replace with your OpenRouter API key

// URL Constants
export const URLS = {
  // API URLs
  OPENROUTER_API_BASE: 'https://openrouter.ai/api/v1',
  
  // Web URLs
  OPENROUTER_HOMEPAGE: 'https://openrouter.ai',
  OPENROUTER_KEYS_PAGE: 'https://openrouter.ai/keys',
  OPENROUTER_MODEL_PAGE: 'https://openrouter.ai/models',
  APP_HTTP_REFERER: 'https://localhost', // Replace with your app URL when deployed
  GITHUB_REPO: 'https://github.com/Ajinkya-Sonawane/openrouter-chat',
  
  // Icon/Image URLs
  ANTHROPIC_ICON: 'https://cdn.oaistatic.com/_next/static/media/anthropic-icon.c7c9cfad.svg',
  OPENAI_ICON: 'https://cdn.oaistatic.com/_next/static/media/openai-logomark.4c2d8970.svg',
  GOOGLE_GEMINI_ICON: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002.svg'
};

// App Theme Colors
export const COLORS = {
  primary: '#128C7E', // WhatsApp green
  secondary: '#075E54', // WhatsApp dark green
  light: '#25D366', // WhatsApp lighter green
  background: '#ECE5DD', // WhatsApp chat background
  white: '#FFFFFF',
  black: '#000000',
  gray: '#999999',
  lightGray: '#EEEEEE',
  error: '#FF0000',
  bubble: {
    user: '#DCF8C6', // WhatsApp user message bubble
    assistant: '#FFFFFF', // WhatsApp received message bubble
  }
};

// Default models
export const DEFAULT_MODELS = [
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Anthropic\'s most powerful model for highly complex tasks',
    image: URLS.ANTHROPIC_ICON
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Anthropic\'s mid-range model balancing intelligence and speed',
    image: URLS.ANTHROPIC_ICON
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Anthropic\'s fastest model for efficient, near-instant responses',
    image: URLS.ANTHROPIC_ICON
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'OpenAI\'s flagship multimodal model',
    image: URLS.OPENAI_ICON
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'OpenAI\'s most capable model for complex tasks',
    image: URLS.OPENAI_ICON
  },
  {
    id: 'google/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Google\'s most capable model for text, code, and multimodal tasks',
    image: URLS.GOOGLE_GEMINI_ICON
  }
]; 