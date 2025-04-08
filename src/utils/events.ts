type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback) {
    console.log(`[EventEmitter] Registering listener for event: ${event}`);
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    
    // Return an unsubscribe function
    return () => {
      console.log(`[EventEmitter] Removing listener for event: ${event}`);
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string, ...args: any[]) {
    console.log(`[EventEmitter] Emitting event: ${event}`, args);
    const callbacks = this.events[event] || [];
    console.log(`[EventEmitter] Number of listeners: ${callbacks.length}`);
    
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

// Export a singleton instance
export const eventEmitter = new EventEmitter();

// Event types
export const EVENT_TYPES = {
  MODEL_SELECTED: 'MODEL_SELECTED',
  CHATS_UPDATED: 'CHATS_UPDATED',
  ROOMS_UPDATED: 'ROOMS_UPDATED',
  API_KEY_CHANGED: 'API_KEY_CHANGED',
  MCP_SERVERS_UPDATED: 'MCP_SERVERS_UPDATED'
}; 