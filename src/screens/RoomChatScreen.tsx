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
  Animated,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../constants';
import { sendMessage, refreshApiKey, checkApiKeyStatus } from '../services/api';
import { getRooms, saveRoom, getModels, clearRoomChat } from '../services/storage'; // Add clearRoomChat
import { getApiKey } from '../services/settings';
import { Room, Message, Model, RoomModel } from '../types'; // Add Model import
import { RootStackParamList } from '../navigation';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import { eventEmitter, EVENT_TYPES } from '../utils/events';
import { MaterialIcons } from '@expo/vector-icons'; // Add icon import
import { Menu } from 'react-native-paper'; // Add Menu import

// Add a custom ID generator function
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Header right menu for the room chat screen
const HeaderRightRoomMenu = ({ roomId }: { roomId: string }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleClearChat = () => {
    Alert.alert(
      'Clear Room Chat',
      'Are you sure you want to clear all messages in this room? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Chat', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await clearRoomChat(roomId);
              setMenuVisible(false);
            } catch (err) {
              console.error('Error clearing room chat:', err);
              Alert.alert('Error', 'Failed to clear room chat');
            }
          } 
        }
      ]
    );
  };

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
            handleClearChat();
          }}
          title="Clear Chat"
          leadingIcon="delete-sweep"
        />
      </Menu>
    </View>
  );
};

// Header title component that's clickable
const HeaderTitle = ({ title, onPress }: { title: string; onPress: () => void }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 17 }}>{title}</Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.white} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
};

type RoomChatScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'RoomChat'>;
  route: RouteProp<RootStackParamList, 'RoomChat'>;
};

const RoomChatScreen: React.FC<RoomChatScreenProps> = ({ navigation, route }) => {
  const { roomId } = route.params;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [modelSelectorVisible, setModelSelectorVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingOpacity = useRef(new Animated.Value(0)).current;

  const scrollToEndWithDelay = useCallback((immediate = false) => {
    // ... (Scrolling logic - same as ChatScreen for now)
    if (immediate) {
      console.log('Scrolling to end immediately');
      flatListRef.current?.scrollToEnd({ animated: false });
      return;
    }
    
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
    console.log(`RoomChatScreen mounted with params: ${JSON.stringify(route.params)}`);
    checkApiKeyStatus();
    
    const apiKeyChangedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.API_KEY_CHANGED,
      (hasKey: boolean) => {
        setApiKeyMissing(!hasKey);
      }
    );

    const roomsUpdatedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.ROOMS_UPDATED,
      () => {
        // Reload the room data when rooms are updated (e.g. after clearing messages)
        loadRoomData(roomId);
      }
    );

    loadRoomData(roomId);

    return () => {
      apiKeyChangedUnsubscribe();
      roomsUpdatedUnsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    if (room) {
      console.log('Setting navigation title to:', room.name);
      
      // Update the navigation options to use our custom header title and menu
      navigation.setOptions({
        headerTitle: () => (
          <HeaderTitle 
            title={room.name} 
            onPress={() => navigation.navigate('RoomProfile', { roomId: room.id, roomName: room.name })} 
          />
        ),
        headerRight: () => (
          <HeaderRightRoomMenu roomId={room.id} />
        )
      });
    }
  }, [room, navigation]);

  // Typing indicator animation
  useEffect(() => {
    Animated.timing(typingOpacity, {
      toValue: waitingForResponse ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [waitingForResponse, typingOpacity]);

  const checkApiKeyStatus = async () => {
    try {
      await refreshApiKey();
      const hasApiKey = await getApiKey();
      console.log('API key status:', hasApiKey ? 'Set' : 'Not set');
      setApiKeyMissing(!hasApiKey);
    } catch (err) {
      console.error('Failed to check API key status:', err);
      setApiKeyMissing(true);
    }
  };

  const loadRoomData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading room with ID:', id);
      const rooms = await getRooms();
      const currentRoom = rooms.find(r => r.id === id);
      if (currentRoom) {
        console.log('Room loaded:', currentRoom.name);
        setRoom(currentRoom);
      } else {
        console.error('Room not found:', id);
        setError('Room not found');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error loading room data:', err);
      setError('Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    setModelsLoading(true);
    try {
      const models = await getModels();
      setAvailableModels(models);
    } catch (err) {
      console.error('Error loading models:', err);
      Alert.alert('Error', 'Failed to load available models');
    } finally {
      setModelsLoading(false);
    }
  };

  const showErrorAlert = (errorMessage: string) => {
    // Simplified error alert for now
    Alert.alert('Error', errorMessage);
  };

  const handleSendMessage = async (textMessage: string) => {
    if (!textMessage.trim() || !room) return;

    console.log('Sending message to room:', room.name);
    setLoading(true);
    setError(null);

    const userMessage: Message = {
      id: generateId(),
      content: textMessage,
      role: 'user',
      timestamp: Date.now(),
    };

    // Add user message locally
    const updatedMessages = [...room.messages, userMessage];
    const updatedRoom: Room = {
      ...room,
      messages: updatedMessages,
      lastMessage: userMessage.content,
      lastMessageTime: userMessage.timestamp
    };
    
    setRoom(updatedRoom);
    await saveRoom(updatedRoom); // Save immediately after adding user message
    
    setWaitingForResponse(true);
    scrollToEndWithDelay(true);

    // Send message to all models in the room
    const modelsInRoom = room.models;
    console.log(`Sending message to ${modelsInRoom.length} models:`, modelsInRoom.map(m => m.name).join(', '));

    const responses: Message[] = [];
    const errors: string[] = [];

    // Use Promise.allSettled to handle responses and errors from all models
    const results = await Promise.allSettled(
      modelsInRoom.map(async (model) => {
        try {
          console.log(`Sending message to model ${model.name} (${model.id})`);
          // Pass the full updated message history
          const response = await sendMessage(model.id, updatedMessages); 
          
          // Add model identifiers to the response message
          const assistantMessage: Message = {
            ...response,
            id: generateId(),
            modelId: model.id,
            modelName: model.name,
          };
          return assistantMessage;
        } catch (apiError) {
          console.error(`Error sending message to model ${model.name}:`, apiError);
          // Throw error to be caught by Promise.allSettled
          throw new Error(`Failed response from ${model.name}: ${apiError instanceof Error ? apiError.message : apiError}`);
        }
      })
    );

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else {
        errors.push(result.reason.message);
      }
    });

    setWaitingForResponse(false); // Stop waiting indicator after all settled

    // Update room state with all successful responses
    if (responses.length > 0) {
      const finalMessages = [...updatedMessages, ...responses];
      // Sort messages by timestamp just in case responses arrive out of order (though unlikely with Promise.allSettled)
      finalMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      const lastResponse = responses[responses.length - 1]; // Use the last successful response for preview
      
      const finalRoom: Room = {
        ...updatedRoom,
        messages: finalMessages,
        lastMessage: lastResponse?.content, // Update last message preview
        lastMessageTime: lastResponse?.timestamp,
      };
      setRoom(finalRoom);
      await saveRoom(finalRoom);
      scrollToEndWithDelay();
    } else {
      // If no responses were successful, keep the user message updated room state
      await saveRoom(updatedRoom);
    }

    // Handle and display errors
    if (errors.length > 0) {
      const errorSummary = errors.join('\n');
      setError(`Errors occurred:\n${errorSummary}`);
      showErrorAlert(`Received errors from some models:\n${errorSummary}`);
    }
    
    setLoading(false); // Ensure loading is set to false after everything
  };
  
  const handleMessageExpansion = useCallback((expanded: boolean, messageId: string) => {
    setExpandedMessageId(expanded ? messageId : null);
    // Scrolling logic for expansion can remain similar to ChatScreen
    if (expanded) {
      const messageIndex = room?.messages.findIndex(msg => msg.id === messageId) ?? -1;
      if (messageIndex >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: messageIndex, animated: true, viewPosition: 0.5 });
        }, 100);
      }
    }
  }, [room?.messages]);

  const renderMessageItem = ({ item }: { item: Message }) => {
    // MessageBubble will need modification to display modelName for assistant messages
    return (
      <MessageBubble 
        message={item}
        onContentRendered={() => {
          // Basic scroll logic on render
          if (!expandedMessageId) {
            // Maybe add a small delay
             setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
          }
        }}
        onExpansionChange={handleMessageExpansion}
      />
    );
  };

  const renderModelItem = ({ item }: { item: Model }) => {
    // Only show models that aren't already in the room
    if (room?.models.some(m => m.id === item.id)) {
      return null;
    }
    
    return (
      <TouchableOpacity
        style={styles.modelSelectItem}
        onPress={() => {}}
      >
        <Text style={styles.modelSelectName}>{item.name}</Text>
        <MaterialIcons name="add-circle" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    );
  };

  if (!room && loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading room...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!room) { // Should not happen if loading/error handled, but good fallback
     return (
        <SafeAreaView style={styles.centered} edges={['bottom']}>
          <Text style={styles.errorText}>Could not load room data.</Text>
        </SafeAreaView>
     );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled
      >
        {apiKeyMissing && (
          <View style={styles.apiKeyWarning}>
            <Text style={styles.apiKeyWarningText}>
              API key missing. Add it in Settings to send messages.
            </Text>
            {/* Add buttons to get key/go to settings if needed */}
          </View>
        )}
        
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={room.messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesContainer}
            onLayout={() => scrollToEndWithDelay(true)}
            onContentSizeChange={() => {
               if (!expandedMessageId) scrollToEndWithDelay();
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Send a message to start the room chat</Text>
              </View>
            }
            ListFooterComponent={
              waitingForResponse ? (
                <Animated.View style={[styles.typingContainer, { opacity: typingOpacity }]}>
                   {/* Could potentially show multiple typing indicators or a generic one */}
                   <View style={styles.typingBubble}>
                      <TypingIndicator />
                   </View>
                </Animated.View>
              ) : <View style={styles.messageListFooter} />
            }
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            scrollIndicatorInsets={{ right: 1 }}
          />
        </View>
        
        <MessageInput 
          onSendMessage={handleSendMessage}
          loading={loading || waitingForResponse} // Show loading if sending or waiting
        />

        {/* Model Selector Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modelSelectorVisible}
          onRequestClose={() => setModelSelectorVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Models to Room</Text>
                <TouchableOpacity 
                  onPress={() => setModelSelectorVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {modelsLoading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading models...</Text>
                </View>
              ) : (
                <FlatList
                  data={availableModels}
                  renderItem={renderModelItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.modelsList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No additional models available</Text>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Use similar styling to ChatScreen, adjusting where needed
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
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    padding: 20,
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
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    paddingTop: 10,
    paddingBottom: 10, // Reduced padding slightly
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    textAlign: 'center',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start', // Align to left for assistant typing
  },
  typingBubble: {
    backgroundColor: COLORS.bubble.assistant,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    padding: 12,
    marginBottom: 5, // Reduced margin
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageListFooter: {
    height: 10, // Reduced footer height
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.gray,
  },
  modalBody: {
    padding: 15,
  },
  roomInfoSection: {
    marginBottom: 20,
  },
  modelsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.gray,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modelName: {
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  modelsList: {
    padding: 10,
  },
  modelSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modelSelectName: {
    fontSize: 16,
    flex: 1,
  },
});

export default RoomChatScreen; 