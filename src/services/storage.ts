import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Model, Room } from '../types';
import { DEFAULT_MODELS } from '../constants';
import { eventEmitter, EVENT_TYPES } from '../utils/events';

const CHATS_STORAGE_KEY = 'openrouter_chats';
const MODELS_STORAGE_KEY = 'openrouter_models';
const ROOMS_KEY = 'rooms'; // Key for storing rooms

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
    
    // Sort chats by the most recent message time (descending)
    chats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    console.log('Chat saved successfully:', chat.id);
    eventEmitter.emit(EVENT_TYPES.CHATS_UPDATED, chats);
  } catch (error) {
    console.error('Error saving chat to storage:', error);
  }
};

export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const chats = await getChats();
    const filteredChats = chats.filter(chat => chat.id !== chatId);
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(filteredChats));
    console.log('Chat deleted successfully:', chatId);
    eventEmitter.emit(EVENT_TYPES.CHATS_UPDATED, filteredChats);
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
    eventEmitter.emit(EVENT_TYPES.CHATS_UPDATED, []);
  } catch (error) {
    console.error('Error clearing chats:', error);
    throw new Error('Failed to clear chats');
  }
};

/**
 * Clear all data: both chats and rooms
 */
export const clearAll = async (): Promise<void> => {
  try {
    // Clear chats
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    console.log('All chats cleared successfully');
    
    // Clear rooms
    await AsyncStorage.removeItem(ROOMS_KEY);
    console.log('All rooms cleared successfully');
    
    // Notify listeners that both chats and rooms have been cleared
    eventEmitter.emit(EVENT_TYPES.CHATS_UPDATED, []);
    eventEmitter.emit(EVENT_TYPES.ROOMS_UPDATED, []);
    
    console.log('All data cleared successfully');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw new Error('Failed to clear data');
  }
};

// --- Room Storage Functions --- 

export const getRooms = async (): Promise<Room[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ROOMS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch rooms:', e);
    return [];
  }
};

export const saveRoom = async (room: Room): Promise<void> => {
  try {
    const rooms = await getRooms();
    const roomIndex = rooms.findIndex((r) => r.id === room.id);

    if (roomIndex > -1) {
      rooms[roomIndex] = room; // Update existing room
    } else {
      rooms.push(room); // Add new room
    }
    
    // Sort rooms by the most recent message time (descending)
    rooms.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    
    const jsonValue = JSON.stringify(rooms);
    await AsyncStorage.setItem(ROOMS_KEY, jsonValue);
    console.log('Room saved successfully:', room.id);
    eventEmitter.emit(EVENT_TYPES.ROOMS_UPDATED, rooms); // Emit room update event
  } catch (e) {
    console.error('Failed to save room:', e);
  }
};

/**
 * Clear all messages from a specific room
 */
export const clearRoomChat = async (roomId: string): Promise<void> => {
  try {
    const rooms = await getRooms();
    const roomIndex = rooms.findIndex((r) => r.id === roomId);
    
    if (roomIndex > -1) {
      // Keep the room but clear its messages
      rooms[roomIndex] = {
        ...rooms[roomIndex],
        messages: [],
        lastMessage: '',
        lastMessageTime: Date.now()
      };
      
      const jsonValue = JSON.stringify(rooms);
      await AsyncStorage.setItem(ROOMS_KEY, jsonValue);
      console.log('Room chat cleared successfully:', roomId);
      eventEmitter.emit(EVENT_TYPES.ROOMS_UPDATED, rooms); // Emit room update event
      return;
    }
    
    console.error('Room not found for clearing:', roomId);
  } catch (e) {
    console.error('Failed to clear room chat:', e);
    throw new Error('Failed to clear room chat');
  }
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  try {
    const rooms = await getRooms();
    const updatedRooms = rooms.filter((r) => r.id !== roomId);
    const jsonValue = JSON.stringify(updatedRooms);
    await AsyncStorage.setItem(ROOMS_KEY, jsonValue);
    console.log('Room deleted successfully:', roomId);
    eventEmitter.emit(EVENT_TYPES.ROOMS_UPDATED, updatedRooms); // Emit room update event
  } catch (e) {
    console.error('Failed to delete room:', e);
  }
};

export const clearAllRooms = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ROOMS_KEY);
    console.log('All rooms cleared successfully.');
    eventEmitter.emit(EVENT_TYPES.ROOMS_UPDATED, []); // Emit room update event
  } catch (e) {
    console.error('Failed to clear all rooms:', e);
  }
}; 