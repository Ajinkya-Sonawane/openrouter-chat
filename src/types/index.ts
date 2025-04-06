export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  modelId?: string;
  modelName?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  maxTokens?: number;
  provider?: string;
  image?: string;
  context_length?: number;
  created?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    modality?: string;
  };
  top_provider?: {
    is_moderated?: boolean;
    name?: string;
  };
}

export interface Chat {
  id: string;
  modelId: string;
  modelName: string;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface RoomModel {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  models: RoomModel[];
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: number;
} 