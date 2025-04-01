export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  modelId?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  maxTokens?: number;
  provider?: string;
  image?: string;
}

export interface Chat {
  id: string;
  modelId: string;
  modelName: string;
  lastMessage?: string;
  lastMessageTime?: number;
  messages: Message[];
} 