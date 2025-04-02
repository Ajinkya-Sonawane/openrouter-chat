import axios, { AxiosError, AxiosInstance } from 'axios';
import { OPENROUTER_API_KEY, URLS } from '../constants';
import { Message } from '../types';
import { getApiKey } from './settings';

// API Key handling
let cachedApiKey: string | null = null;
let isRefreshing = false;

// Initialize API key on app startup
export const initializeApiKey = async (): Promise<void> => {
  try {
    if (!cachedApiKey) {
      const storedKey = await getApiKey();
      cachedApiKey = storedKey;
      console.log('API key initialized:', storedKey ? '✓ Found' : '✗ Not found');
    }
  } catch (error) {
    console.error('Failed to initialize API key:', error);
  }
};

// Refresh the API key (call after saving a new key)
export const refreshApiKey = async (): Promise<void> => {
  try {
    // Prevent infinite loops with this flag
    if (isRefreshing) return;
    
    isRefreshing = true;
    const storedKey = await getApiKey();
    cachedApiKey = storedKey;
    console.log('API key refreshed');
  } catch (error) {
    console.error('Failed to refresh API key:', error);
  } finally {
    isRefreshing = false;
  }
};

// Get API client with current key
const getApiClient = (): AxiosInstance => {
  const key = cachedApiKey || OPENROUTER_API_KEY;
  
  if (!key) {
    console.warn('No API key available');
  }
  
  return axios.create({
    baseURL: URLS.OPENROUTER_API_BASE,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': URLS.APP_HTTP_REFERER,
      'X-Title': 'OpenRouterChat'  // Replace with your app name
    }
  });
};

export const checkApiKey = async (): Promise<boolean> => {
  if (!cachedApiKey) {
    await refreshApiKey();
  }
  return cachedApiKey !== '';
};

// Check if the API key is set
export const checkApiKeyStatus = (): boolean => {
  return !!cachedApiKey;
};

export const fetchModels = async () => {
  try {
    const response = await getApiClient().get('/models');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // For models, we can return a sample/default set if we don't have an API key yet
    if ((error as AxiosError).response?.status === 401) {
      // Return some sample models if no API key is available
      return [
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' }
      ];
    }
    
    throw error;
  }
};

export const fetchModelDetails = async (modelId: string) => {
  try {
    const models = await fetchModels();
    const modelDetails = models.find((model: any) => model.id === modelId);
    
    if (!modelDetails) {
      console.error('Model not found:', modelId);
      throw new Error('Model not found');
    }
    
    return modelDetails;
  } catch (error) {
    console.error('Error fetching model details:', error);
    throw error;
  }
};

// Parse provider error messages from OpenRouter API
const getProviderErrorMessage = (error: any): string => {
  try {
    // Check if it's an OpenRouter error with provider metadata
    if (error.response?.data?.error?.metadata?.raw) {
      const rawError = JSON.parse(error.response.data.error.metadata.raw);
      
      // Handle Google errors
      if (error.response.data.error.metadata.provider_name === 'Google AI Studio') {
        if (rawError.error?.code === 429) {
          return `Rate limit exceeded for Google AI: ${rawError.error.message}`;
        }
        return `Google AI error: ${rawError.error?.message || 'Unknown error'}`;
      }
      
      // Handle OpenAI errors
      if (error.response.data.error.metadata.provider_name === 'OpenAI') {
        return `OpenAI error: ${rawError.error?.message || 'Unknown error'}`;
      }
      
      // Handle Anthropic errors
      if (error.response.data.error.metadata.provider_name === 'Anthropic') {
        return `Anthropic error: ${rawError.error?.message || 'Unknown error'}`;
      }
      
      // Generic provider error
      return `Provider error: ${error.response.data.error.message}`;
    }
    
    // Default OpenRouter error
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    
    // Generic axios error
    return error.message || 'Unknown error';
  } catch (parseError) {
    console.error('Error parsing provider error:', parseError);
    return error.message || 'Unknown error';
  }
};

export const sendMessage = async (
  modelId: string,
  messages: Message[]
) => {
  if (!(await checkApiKey())) {
    throw new Error('OpenRouter API key is not set. Please add your API key in Settings.');
  }

  try {
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('Sending message to model:', modelId);
    console.log('Messages payload:', JSON.stringify(formattedMessages));

    const response = await getApiClient().post('/chat/completions', {
      model: modelId,
      messages: formattedMessages
    });

    console.log('Response received:', response.status);
    
    // If response has error field, handle it even if status is 200
    if (response.data?.error) {
      console.error('API returned error in response:', response.data.error);
      throw new Error(getProviderErrorMessage({ 
        response: { 
          data: response.data 
        } 
      }));
    }
    
    // Check if the response has the expected structure
    if (!response.data?.choices?.[0]?.message?.content) {
      if (response.data?.choices?.[0]?.message) {
        // Handle case where content might be empty but structure is correct
        return {
          id: Math.random().toString(36).substring(2, 15),
          content: response.data.choices[0].message.content || "No content received from the model.",
          role: 'assistant' as const,
          timestamp: Date.now(),
          modelId
        };
      }
      
      console.error('Unexpected API response structure:', JSON.stringify(response.data));
      throw new Error('Received unexpected response structure from OpenRouter API');
    }

    return {
      id: Math.random().toString(36).substring(2, 15),
      content: response.data.choices[0].message.content,
      role: 'assistant' as const,
      timestamp: Date.now(),
      modelId
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
    
    // If it's an Axios error, log more details
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
        
        // Try to extract provider-specific error message
        const providerErrorMessage = getProviderErrorMessage(error);
        throw new Error(providerErrorMessage);
      } else if (error.request) {
        console.error('Request made but no response received');
        throw new Error('No response received from the API. Please check your internet connection.');
      } else {
        console.error('Error setting up request:', error.message);
        throw new Error(`Error setting up request: ${error.message}`);
      }
    }
    
    // Handle non-axios errors
    throw error;
  }
}; 