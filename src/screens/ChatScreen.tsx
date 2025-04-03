import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  Alert,
  Linking,
  TouchableOpacity,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, URLS } from '../constants';
import { sendMessage, refreshApiKey, checkApiKeyStatus } from '../services/api';
import { getChats, saveChat } from '../services/storage';
import { getApiKey } from '../services/settings';
import { Chat, Message } from '../types';
import { RootStackParamList } from '../navigation';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import { eventEmitter, EVENT_TYPES } from '../utils/events';
import ModelSwitch from '../components/ModelSwitch';
import { Menu, Provider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

type ChatScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

// Header right menu for the chat screen
const HeaderRightChatMenu = ({ clearChatHistory }: { clearChatHistory: () => void }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={{ marginRight: 15 }}
          >
            <MaterialIcons name="more-vert" size={24} color={COLORS.white} />
          </TouchableOpacity>
        }
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            clearChatHistory();
          }}
          title="Clear Chat"
          leadingIcon="delete-sweep"
        />
      </Menu>
    </View>
  );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const typingOpacity = useRef(new Animated.Value(0)).current;

  // Create a more robust scroll function
  const scrollToEndWithDelay = useCallback((immediate = false) => {
    if (immediate) {
      console.log('Scrolling to end immediately');
      flatListRef.current?.scrollToEnd({ animated: false });
      return;
    }
    
    // Sequence of scroll attempts with increasing delays to ensure content is visible
    console.log('Starting scroll sequence');
    setTimeout(() => {
      console.log('Scrolling attempt 1 (50ms)');
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
    setTimeout(() => {
      console.log('Scrolling attempt 2 (300ms)');
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
    setTimeout(() => {
      console.log('Scrolling attempt 3 (600ms)');
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 600);
    setTimeout(() => {
      console.log('Scrolling attempt 4 (1000ms)');
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 1000);
  }, []);

  useEffect(() => {
    console.log('ChatScreen mounted with params:', route.params);
    
    // Check API key status
    checkApiKeyStatus();
    
    // Listen for API key changes
    const apiKeyChangedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.API_KEY_CHANGED,
      (hasKey: boolean) => {
        console.log('API key changed event received:', hasKey ? 'Key set' : 'Key not set');
        setApiKeyMissing(!hasKey);
      }
    );
    
    // Check if we have a chatId (existing chat) or modelId (new chat)
    try {
      if ('chatId' in route.params) {
        console.log('Loading existing chat with ID:', route.params.chatId);
        loadExistingChat(route.params.chatId);
      } else if ('modelId' in route.params && 'modelName' in route.params) {
        console.log('Creating new chat with model:', route.params.modelName);
        createNewChat(route.params.modelId, route.params.modelName);
      } else {
        console.error('Invalid route params:', route.params);
        setError('Invalid parameters. Cannot create or load chat.');
      }
    } catch (err) {
      console.error('Error in chat initialization:', err);
      setError('Failed to initialize chat');
    }
    
    return () => {
      apiKeyChangedUnsubscribe();
    };
  }, [route.params]);

  useEffect(() => {
    // Update the navigation title with the model name
    if (chat) {
      console.log('Setting navigation title to:', chat.modelName);
      
      // Function to truncate model name if too long
      const truncateModelName = (name: string, maxLength: number = 25) => {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
      };
      
      navigation.setOptions({
        title: chat.modelName,
        // Add a custom header title component that's touchable
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => {
              if (chat) {
                navigation.navigate('ModelProfile', {
                  modelId: chat.modelId,
                  modelName: chat.modelName
                });
              }
            }}
            accessibilityLabel="View model details"
          >
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {truncateModelName(chat.modelName)}
              </Text>
              <Text style={styles.headerSubtitle}>Tap for model info</Text>
            </View>
          </TouchableOpacity>
        ),
        // Add the header right menu with clear chat option
        headerRight: () => <HeaderRightChatMenu clearChatHistory={clearChatHistory} />
      });
    }
  }, [chat, navigation]);

  // Fade in/out animation for the typing indicator
  useEffect(() => {
    if (waitingForResponse) {
      Animated.timing(typingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(typingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [waitingForResponse, typingOpacity]);

  const checkApiKeyStatus = async () => {
    try {
      // Only check API key status once
      await refreshApiKey();
      // Use direct check of cachedApiKey from api.ts
      const hasApiKey = await getApiKey();
      setApiKeyMissing(!hasApiKey);
    } catch (err) {
      console.error('Failed to check API key status:', err);
      setApiKeyMissing(true);
    }
  };

  const loadExistingChat = async (chatId: string) => {
    try {
      console.log('Loading chat from storage:', chatId);
      const chats = await getChats();
      console.log('Found chats:', chats.length);
      const existingChat = chats.find(c => c.id === chatId);
      
      if (existingChat) {
        console.log('Chat found:', existingChat.modelName);
        setChat(existingChat);
      } else {
        console.error('Chat not found:', chatId);
        setError('Chat not found');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error loading existing chat:', err);
      setError('Failed to load chat data');
    }
  };

  const createNewChat = async (modelId: string, modelName: string) => {
    try {
      console.log('Creating new chat for model:', modelId, modelName);
      
      const newChat: Chat = {
        id: Math.random().toString(36).substring(2, 15),
        modelId,
        modelName,
        messages: []
      };
      
      console.log('New chat created with ID:', newChat.id);
      setChat(newChat);
      
      console.log('Saving new chat to storage');
      await saveChat(newChat);
      console.log('Chat saved successfully');
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to create new chat');
      Alert.alert('Error', 'Failed to create new chat');
    }
  };

  const showErrorAlert = (errorMessage: string) => {
    // Check for specific error types
    if (errorMessage.includes('Rate limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      Alert.alert(
        'Rate Limit Exceeded',
        'You have reached the usage limit for this model. Would you like to start a new chat with a different model?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Select New Model', 
            onPress: () => navigation.navigate('ModelSelection')
          }
        ]
      );
      return;
    }
    
    if (errorMessage.includes('API key')) {
      Alert.alert(
        'API Key Required',
        'You need to set your OpenRouter API key in Settings to send messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Settings', 
            onPress: () => navigation.navigate('Settings')
          }
        ]
      );
      return;
    }
    
    // Generic error
    Alert.alert(
      'Error',
      errorMessage,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleSendMessage = async (textMessage: string) => {
    try {
      if (!textMessage.trim()) return;
      
      console.log('Sending message:', textMessage);
      setLoading(true);
      setError(null);
      
      // Create a new message
      const newMessage: Message = {
        id: Date.now().toString(),
        content: textMessage,
        role: 'user',
        timestamp: Date.now(),
      };
      
      // Add the message to the chat - prepend for inverted list 
      // (though we could still append and let inverted list handle it)
      const updatedMessages = [...chat!.messages, newMessage];
      const updatedChat: Chat = {
        ...chat!,
        messages: updatedMessages,
        lastMessage: newMessage.content,
        lastMessageTime: newMessage.timestamp
      };
      
      setChat(updatedChat);
      await saveChat(updatedChat);
      
      // Show the waiting animation
      setWaitingForResponse(true);
      
      // Scroll to the end to show the new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Log chat info for debugging
      console.log('Chat model ID:', chat!.modelId);
      console.log('Number of messages in conversation:', updatedMessages.length);
      
      try {
        // Send the message to the API and get the response
        const responseMessage = await sendMessage(chat!.modelId, updatedMessages);
        
        // Hide the waiting animation
        setWaitingForResponse(false);
        
        const finalMessages = [...updatedMessages, responseMessage];
        const finalChat: Chat = {
          ...chat!,
          messages: finalMessages,
          lastMessage: responseMessage.content,
          lastMessageTime: responseMessage.timestamp
        };
        
        setChat(finalChat);
        await saveChat(finalChat);
        
        // Scroll to the end to show the new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (apiError) {
        console.error('API Error during message sending:', apiError);
        // Hide the waiting animation
        setWaitingForResponse(false);
        
        const errorMsg = apiError instanceof Error ? apiError.message : 'Failed to send message';
        setError(`API Error: ${errorMsg}`);
        
        // Show appropriate alert based on error type
        showErrorAlert(errorMsg);
      }
    } catch (err) {
      console.error('Error in message handling flow:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(`Error: ${errorMsg}`);
      
      // Hide the waiting animation
      setWaitingForResponse(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageExpansion = useCallback((expanded: boolean, messageId: string) => {
    console.log(`Message ${messageId} expansion changed to ${expanded}`);
    
    // Track which message is expanded for scrolling management
    setExpandedMessageId(expanded ? messageId : null);
    
    // When a message expands, we need to scroll to make sure it's fully visible
    if (expanded) {
      // Find the index of the expanded message
      const messageIndex = chat?.messages.findIndex(msg => msg.id === messageId) ?? -1;
      
      if (messageIndex >= 0) {
        console.log(`Scrolling to ensure expanded message ${messageId} is visible`);
        
        // Use a slight delay to let the layout update first
        setTimeout(() => {
          // For inverted lists, we need to use scrollToIndex in a special way
          flatListRef.current?.scrollToIndex({
            index: messageIndex,
            animated: true,
            viewPosition: 0.5, // Try to center the item
            viewOffset: 50,    // Add some padding
          });
        }, 100);
      }
    }
  }, [chat?.messages]);

  const renderMessageItem = ({ item }: { item: Message }) => {
    return (
      <MessageBubble 
        message={item}
        onContentRendered={() => {
          // For non-inverted lists, we need to scroll when assistant messages render
          if (item.role === 'assistant' && !expandedMessageId) {
            console.log(`Message ${item.id} rendered, scrolling to ensure visibility`);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
          } else {
            console.log(`Message ${item.id} rendered`);
          }
        }}
        onExpansionChange={handleMessageExpansion}
      />
    );
  };

  const handleGetApiKey = () => {
    navigation.navigate('Settings');
  };

  const handleModelSwitch = async (modelId: string, modelName: string) => {
    try {
      setLoading(true);
      
      // If this was triggered from a rate limit error, create a completely new chat
      if (error?.includes('Rate limit')) {
        // Navigate to a new chat with the selected model
        navigation.replace('Chat', { modelId, modelName });
        return;
      }
      
      // Otherwise, just change the model for the current chat (keeping existing messages)
      const newChat: Chat = {
        id: Math.random().toString(36).substring(2, 15),
        modelId,
        modelName,
        messages: chat ? [...chat.messages] : [],
        lastMessage: chat?.lastMessage,
        lastMessageTime: chat?.lastMessageTime
      };
      
      // Save the new chat and update state
      await saveChat(newChat);
      setChat(newChat);
      
      // Update navigation title
      navigation.setOptions({
        title: modelName
      });
      
      // Show success message
      Alert.alert('Model Changed', `Changed to ${modelName} successfully`);
    } catch (err) {
      console.error('Error switching models:', err);
      setError('Failed to switch models');
    } finally {
      setLoading(false);
    }
  };

  // Function to clear the current chat history
  const clearChatHistory = () => {
    Alert.alert(
      "Clear Chat",
      "Are you sure you want to clear all messages in this chat?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              if (chat) {
                // Create a new chat with the same model but no messages
                const clearedChat: Chat = {
                  ...chat,
                  messages: [],
                  lastMessage: undefined,
                  lastMessageTime: undefined
                };
                
                // Update state and save to storage
                setChat(clearedChat);
                await saveChat(clearedChat);
                
                console.log('Chat history cleared successfully');
              }
            } catch (error) {
              console.error('Error clearing chat history:', error);
              Alert.alert('Error', 'Failed to clear chat history');
            }
          }
        }
      ]
    );
  };

  if (!chat) {
    return (
      <Provider>
        <SafeAreaView style={styles.centered} edges={['bottom']}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Initializing chat...</Text>
        </SafeAreaView>
      </Provider>
    );
  }

  return (
    <Provider>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          enabled
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('Rate limit') && (
                <View style={styles.modelSwitchContainer}>
                  <Text style={styles.modelSwitchText}>
                    You've reached the rate limit for this model. Start a new chat with a different model:
                  </Text>
                  <ModelSwitch
                    currentModelId={chat!.modelId}
                    onModelSelect={handleModelSwitch}
                    isRateLimitError={true}
                  />
                </View>
              )}
            </View>
          )}
          
          {apiKeyMissing && (
            <View style={styles.apiKeyWarning}>
              <Text style={styles.apiKeyWarningText}>
                OpenRouter API key is missing. You need to add your API key to send messages.
              </Text>
              <View style={styles.apiKeyButtonRow}>
                <TouchableOpacity 
                  style={styles.apiKeyButton} 
                  onPress={() => Linking.openURL(URLS.OPENROUTER_KEYS_PAGE)}
                >
                  <Text style={styles.apiKeyButtonText}>Get API Key</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.apiKeyButton, styles.settingsButton]} 
                  onPress={handleGetApiKey}
                >
                  <Text style={styles.apiKeyButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={chat.messages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesContainer}
              onLayout={() => {
                console.log('FlatList layout complete');
                if (chat.messages.length > 0 && !expandedMessageId) {
                  scrollToEndWithDelay(true);
                }
              }}
              onContentSizeChange={(width, height) => {
                if (expandedMessageId) {
                  console.log('Content size changed - not scrolling (expanded message present)');
                } else {
                  console.log('Content size changed - scrolling to end');
                  scrollToEndWithDelay();
                }
              }}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: expandedMessageId ? 0 : 10
              }}
              maxToRenderPerBatch={5}
              windowSize={5}
              scrollIndicatorInsets={{ right: 1 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Send a message to start chatting</Text>
                </View>
              }
              ListFooterComponent={
                waitingForResponse ? (
                  <Animated.View 
                    style={[
                      styles.typingContainer, 
                      { opacity: typingOpacity }
                    ]}
                  >
                    <View style={styles.typingBubble}>
                      <TypingIndicator />
                    </View>
                  </Animated.View>
                ) : <View style={styles.messageListFooter} />
              }
              onScrollToIndexFailed={(info) => {
                console.log('Failed to scroll to index:', info);
                // Try again with some delay and different parameters
                setTimeout(() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0
                    });
                  }
                }, 300);
              }}
            />
          </View>
          
          <MessageInput 
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffcccc',
    borderRadius: 5,
    margin: 10,
  },
  errorText: {
    color: '#cc0000',
    textAlign: 'center',
  },
  apiKeyWarning: {
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  apiKeyWarningText: {
    color: '#856404',
    marginBottom: 10,
    textAlign: 'center',
  },
  apiKeyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  apiKeyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  settingsButton: {
    backgroundColor: COLORS.secondary,
  },
  apiKeyButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    paddingTop: 20,
    paddingBottom: 50,
  },
  modelSwitchContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  modelSwitchText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#856404',
  },
  headerTitleContainer: {
    alignItems: 'center',
    maxWidth: 200,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: COLORS.bubble.assistant,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    padding: 12,
    marginBottom: 10,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageListFooter: {
    height: 20,
  },
});

export default ChatScreen; 