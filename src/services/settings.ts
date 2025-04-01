import AsyncStorage from '@react-native-async-storage/async-storage';
import { eventEmitter, EVENT_TYPES } from '../utils/events';

const API_KEY_STORAGE_KEY = 'openrouter_api_key';

/**
 * Retrieves the stored API key
 * @returns The API key or an empty string if not found
 */
export const getApiKey = async (): Promise<string> => {
  try {
    const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
    return apiKey || '';
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return '';
  }
};

/**
 * Saves the API key to storage
 * @param apiKey The API key to save
 */
export const saveApiKey = async (apiKey: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    console.log('API key saved successfully');
    
    // Emit event that API key has changed
    eventEmitter.emit(EVENT_TYPES.API_KEY_CHANGED, !!apiKey);
  } catch (error) {
    console.error('Error saving API key:', error);
    throw new Error('Failed to save API key');
  }
};

/**
 * Clears the stored API key
 */
export const clearApiKey = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
    console.log('API key cleared successfully');
    
    // Emit event that API key has been cleared
    eventEmitter.emit(EVENT_TYPES.API_KEY_CHANGED, false);
  } catch (error) {
    console.error('Error clearing API key:', error);
    throw new Error('Failed to clear API key');
  }
}; 