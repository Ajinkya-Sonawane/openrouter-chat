import { EventEmitter } from 'events';

// Create a singleton event emitter instance
const eventEmitter = new EventEmitter();

export const EVENTS = {
  MODEL_SELECTED: 'model_selected',
  CHATS_UPDATED: 'chats_updated'
};

export default eventEmitter; 