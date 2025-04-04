import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Animated
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FAB } from 'react-native-paper';
import { COLORS } from '../constants';
import { getChats, deleteChat } from '../services/storage';
import { checkApiKeyStatus } from '../services/api';
import { Chat } from '../types';
import { RootStackParamList } from '../navigation';
import { Swipeable } from 'react-native-gesture-handler';
import { eventEmitter, EVENT_TYPES } from '../utils/events';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing the tooltip display state
const TOOLTIP_SHOWN_KEY = 'longpress_tooltip_shown';

type ChatListScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ChatList'>;
};

const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showLongPressTooltip, setShowLongPressTooltip] = useState(false);
  const tooltipOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('ChatListScreen mounted');
    
    // Check if API key is set
    checkApiKey();
    
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('ChatListScreen focused, loading chats');
      loadChats();
      checkApiKey();
    });

    loadChats();
    
    // Listen for model selection events
    console.log('Setting up model selection listener');
    const modelSelectedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.MODEL_SELECTED,
      (modelId: string, modelName: string) => {
        console.log('Model selected event received:', modelId, modelName);
        handleCreateChat(modelId, modelName);
      }
    );
    
    // Listen for chat updates (when chats are cleared)
    const chatsUpdatedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.CHATS_UPDATED,
      () => {
        console.log('Chats updated event received, reloading chats');
        loadChats();
      }
    );
    
    // Listen for API key changes
    const apiKeyChangedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.API_KEY_CHANGED,
      (hasKey: boolean) => {
        console.log('API key changed event received:', hasKey ? 'Key set' : 'Key not set');
        setHasApiKey(hasKey);
      }
    );

    // Check if we should show the long press tooltip
    checkTooltipStatus();

    return () => {
      console.log('ChatListScreen unmounting');
      unsubscribe();
      modelSelectedUnsubscribe();
      chatsUpdatedUnsubscribe();
      apiKeyChangedUnsubscribe();
    };
  }, [navigation]);

  // Effect to show tooltip animation when visible
  useEffect(() => {
    if (showLongPressTooltip) {
      Animated.sequence([
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(500)
      ]).start();
    } else {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showLongPressTooltip, tooltipOpacity]);

  // Check if we've already shown the tooltip to the user
  const checkTooltipStatus = async () => {
    try {
      const tooltipShown = await AsyncStorage.getItem(TOOLTIP_SHOWN_KEY);
      if (tooltipShown !== 'true' && chats.length > 0) {
        setShowLongPressTooltip(true);
      }
    } catch (error) {
      console.error('Error checking tooltip status:', error);
    }
  };

  // Mark the tooltip as shown
  const dismissTooltip = async () => {
    try {
      await AsyncStorage.setItem(TOOLTIP_SHOWN_KEY, 'true');
      setShowLongPressTooltip(false);
    } catch (error) {
      console.error('Error saving tooltip status:', error);
      setShowLongPressTooltip(false);
    }
  };

  // Effect to filter chats when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = chats.filter(chat => {
        // Search by model name
        const modelNameMatch = chat.modelName.toLowerCase().includes(lowercaseQuery);
        
        // Search by message content
        const messageMatch = chat.messages.some(message => 
          message.content.toLowerCase().includes(lowercaseQuery)
        );
        
        // Search by last message if it exists
        const lastMessageMatch = chat.lastMessage ? 
          chat.lastMessage.toLowerCase().includes(lowercaseQuery) : 
          false;
        
        return modelNameMatch || messageMatch || lastMessageMatch;
      });
      
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const checkApiKey = () => {
    const hasKey = checkApiKeyStatus();
    console.log('API key status:', hasKey ? 'Set' : 'Not set');
    setHasApiKey(hasKey);
  };

  const loadChats = async () => {
    console.log('Loading chats');
    setLoading(true);
    try {
      const loadedChats = await getChats();
      console.log(`Loaded ${loadedChats.length} chats`);
      setChats(loadedChats);
      setFilteredChats(loadedChats); // Set filtered chats to all chats initially
      
      // Check if we should show tooltip when chats are loaded
      if (loadedChats.length > 0) {
        checkTooltipStatus();
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = (modelId: string, modelName: string) => {
    try {
      navigation.navigate('Chat', {
        modelId,
        modelName
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate to chat screen');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log('Attempting to delete chat:', chatId);
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(chatId);
              loadChats();
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const renderRightActions = (chatId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteChat(chatId)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
    >
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          console.log('Opening chat:', item.id);
          navigation.navigate('Chat', { chatId: item.id });
        }}
        onLongPress={() => {
          console.log('Long press detected on chat:', item.id);
          // Trigger haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleDeleteChat(item.id);
        }}
        delayLongPress={500}
      >
        <View style={styles.chatInfo}>
          <Text style={styles.modelName}>{item.modelName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
        {item.lastMessageTime && (
          <Text style={styles.timestamp}>
            {new Date(item.lastMessageTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      {!hasApiKey && (
        <TouchableOpacity 
          style={styles.warningBanner}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.warningText}>
            OpenRouter API key not set. Tap here to add your API key in Settings.
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <MaterialIcons name="clear" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Long press tooltip - only shown if showLongPressTooltip is true */}
      {filteredChats.length > 0 && showLongPressTooltip && (
        <Animated.View style={[styles.tooltipContainer, { opacity: tooltipOpacity }]}>
          <View style={styles.tooltipContent}>
            <MaterialIcons name="touch-app" size={20} color={COLORS.white} style={styles.tooltipIcon} />
            <Text style={styles.tooltipText}>
              Pro tip: Long press on a chat to quickly delete it
            </Text>
            <TouchableOpacity onPress={dismissTooltip} style={styles.tooltipCloseButton}>
              <MaterialIcons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}
      
      {filteredChats.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          {searchQuery.length > 0 ? (
            <>
              <Text style={styles.emptyText}>No chats match your search</Text>
              <Text style={styles.emptySubText}>
                Try a different search term
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubText}>
                Tap the + button to start a new chat
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('ModelSelection')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFE69C',
    borderWidth: 1,
    padding: 12,
    width: '100%',
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  tooltipContainer: {
    position: 'absolute',
    top: 70, // Position it below the search bar
    alignSelf: 'center',
    zIndex: 10,
    paddingHorizontal: 15,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  tooltipArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.secondary,
    transform: [{ rotate: '180deg' }],
  },
  tooltipIcon: {
    marginRight: 8,
  },
  tooltipText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
  },
  tooltipCloseButton: {
    padding: 3,
    marginLeft: 5,
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.gray,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    flexGrow: 1,
  },
});

export default ChatListScreen; 