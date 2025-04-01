import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Model } from '../types';
import { DEFAULT_MODELS } from '../constants';
import { eventEmitter, EVENT_TYPES } from '../utils/events';

const CHATS_STORAGE_KEY = 'openrouter_chats';
const MODELS_STORAGE_KEY = 'openrouter_models';

export const getChats = async (): Promise<Chat[]> => {
  try {
    const data = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting chats from storage:', error);
    return [];
  }
};

export const saveChat = async (chat: Chat): Promise<void> => {
  try {
    const chats = await getChats();
    const chatIndex = chats.findIndex(c => c.id === chat.id);
    
    if (chatIndex >= 0) {
      // Update existing chat
      chats[chatIndex] = chat;
    } else {
      // Add new chat
      chats.push(chat);
    }
    
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chat to storage:', error);
  }
};

export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const chats = await getChats();
    const filteredChats = chats.filter(chat => chat.id !== chatId);
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(filteredChats));
  } catch (error) {
    console.error('Error deleting chat from storage:', error);
  }
};

export const getModels = async (): Promise<Model[]> => {
  try {
    const data = await AsyncStorage.getItem(MODELS_STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_MODELS;
  } catch (error) {
    console.error('Error getting models from storage:', error);
    return DEFAULT_MODELS;
  }
};

export const saveModels = async (models: Model[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
  } catch (error) {
    console.error('Error saving models to storage:', error);
  }
};

/**
 * Clear all chats from storage
 */
export const clearAllChats = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    console.log('All chats cleared successfully');
    
    // Notify listeners that chats have been cleared
    eventEmitter.emit(EVENT_TYPES.CHATS_UPDATED);
  } catch (error) {
    console.error('Error clearing chats:', error);
    throw new Error('Failed to clear chats');
  }
}; 