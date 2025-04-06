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
import { FAB, Portal, Provider as PaperProvider } from 'react-native-paper';
import { COLORS } from '../constants';
import { getChats, deleteChat, getRooms, deleteRoom } from '../services/storage';
import { checkApiKeyStatus } from '../services/api';
import { Chat, Room } from '../types';
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredItems, setFilteredItems] = useState<(Chat | Room)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showLongPressTooltip, setShowLongPressTooltip] = useState(false);
  const tooltipOpacity = React.useRef(new Animated.Value(0)).current;
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    console.log('ChatListScreen mounted');
    
    // Check if API key is set
    checkApiKey();
    
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('ChatListScreen focused, loading data');
      loadData();
      checkApiKey();
    });

    loadData();
    
    // Listen for model selection events
    console.log('Setting up model selection listener');
    const modelSelectedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.MODEL_SELECTED,
      (modelId: string, modelName: string) => {
        console.log('Model selected event received:', modelId, modelName);
        handleCreateChat(modelId, modelName);
      }
    );
    
    // Listen for chat AND room updates
    const chatsUpdatedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.CHATS_UPDATED,
      () => {
        console.log('Chats updated event received, reloading data');
        loadData();
      }
    );
    const roomsUpdatedUnsubscribe = eventEmitter.on(
      EVENT_TYPES.ROOMS_UPDATED,
      () => {
        console.log('Rooms updated event received, reloading data');
        loadData();
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
      unsubscribeFocus();
      modelSelectedUnsubscribe();
      chatsUpdatedUnsubscribe();
      roomsUpdatedUnsubscribe();
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
      if (tooltipShown !== 'true' && (chats.length > 0 || rooms.length > 0)) {
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

  // Effect to filter combined items
  useEffect(() => {
    const combinedItems = [...chats, ...rooms];
    if (searchQuery.trim() === '') {
      setFilteredItems(combinedItems);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = combinedItems.filter(item => {
        if ('modelId' in item) { // It's a Chat
          const modelNameMatch = item.modelName.toLowerCase().includes(lowercaseQuery);
          const messageMatch = item.messages.some(message => 
            message.content.toLowerCase().includes(lowercaseQuery)
          );
          const lastMessageMatch = item.lastMessage ? 
            item.lastMessage.toLowerCase().includes(lowercaseQuery) : 
            false;
          return modelNameMatch || messageMatch || lastMessageMatch;
        } else { // It's a Room
          const roomNameMatch = item.name.toLowerCase().includes(lowercaseQuery);
          const modelNameMatch = item.models.some(model => model.name.toLowerCase().includes(lowercaseQuery));
          const messageMatch = item.messages.some(message => 
            message.content.toLowerCase().includes(lowercaseQuery)
          );
           const lastMessageMatch = item.lastMessage ? 
            item.lastMessage.toLowerCase().includes(lowercaseQuery) : 
            false;
          return roomNameMatch || modelNameMatch || messageMatch || lastMessageMatch;
        }
      });
      setFilteredItems(filtered);
    }
  }, [searchQuery, chats, rooms]);

  const checkApiKey = () => {
    const hasKey = checkApiKeyStatus();
    console.log('API key status:', hasKey ? 'Set' : 'Not set');
    setHasApiKey(hasKey);
  };

  const loadData = async () => {
    console.log('Loading chats and rooms');
    setLoading(true);
    try {
      const loadedChats = await getChats();
      const loadedRooms = await getRooms();
      console.log(`Loaded ${loadedChats.length} chats and ${loadedRooms.length} rooms`);
      
      // Combine and sort by last message time
      const combined = [...loadedChats, ...loadedRooms];
      combined.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

      setChats(loadedChats);
      setRooms(loadedRooms);
      setFilteredItems(combined); // Set filtered items initially
      
      if (combined.length > 0) {
        checkTooltipStatus();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (modelId: string, modelName: string) => {
    try {
      // First, check if a chat with this model already exists
      const existingChats = await getChats();
      const existingChat = existingChats.find(chat => chat.modelId === modelId);
      
      if (existingChat) {
        console.log('Found existing chat for model:', modelId, 'Chat ID:', existingChat.id);
        // Navigate to the existing chat instead of creating a new one
        navigation.navigate('Chat', { chatId: existingChat.id });
      } else {
        console.log('No existing chat found for model:', modelId, 'Creating new chat');
        // Create a new chat by navigating to Chat screen with modelId and modelName
        navigation.navigate('Chat', {
          modelId,
          modelName
        });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate to chat screen');
    }
  };

  const handleDeleteItem = async (item: Chat | Room) => {
    const isChat = 'modelId' in item;
    const id = item.id;
    const type = isChat ? 'Chat' : 'Room';
    const name = isChat ? item.modelName : item.name;
    
    console.log(`Attempting to delete ${type}:`, id, name);
    Alert.alert(
      `Delete ${type}`,
      `Are you sure you want to delete this ${type.toLowerCase()} (${name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isChat) {
                await deleteChat(id);
              } else {
                await deleteRoom(id);
              }
              // loadData() will be triggered by the event emitter
            } catch (error) {
              console.error(`Error deleting ${type}:`, error);
              Alert.alert('Error', `Failed to delete ${type.toLowerCase()}`);
            }
          },
        },
      ]
    );
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const renderRightActions = (item: Chat | Room) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Chat | Room }) => {
    const isChat = 'modelId' in item;
    const title = isChat ? item.modelName : item.name;
    const subtitle = item.lastMessage || (isChat ? 'No messages yet' : 'No messages in room');
    const timestamp = item.lastMessageTime;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => {
            if (isChat) {
              console.log('Opening chat:', item.id);
              navigation.navigate('Chat', { chatId: item.id });
            } else {
              console.log('Opening room:', item.id);
              navigation.navigate('RoomChat', { roomId: item.id });
            }
          }}
          onLongPress={() => {
            console.log(`Long press detected on ${isChat ? 'chat' : 'room'}:`, item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDeleteItem(item);
          }}
          delayLongPress={500}
        >
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{title}</Text>
            {!isChat && (
              <Text style={styles.roomModels} numberOfLines={1}>
                Models: {(item as Room).models.map(m => m.name).join(', ')}
              </Text>
            )}
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          {timestamp && (
            <Text style={styles.timestamp}>
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <PaperProvider>
      <Portal>
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
          {filteredItems.length > 0 && showLongPressTooltip && (
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
          
          {filteredItems.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <>
                  <Text style={styles.emptyText}>No items match your search</Text>
                  <Text style={styles.emptySubText}>Try a different search term</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyText}>No chats or rooms yet</Text>
                  <Text style={styles.emptySubText}>Tap the + button to start</Text>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
            />
          )}
          
          {/* FAB Group */}
          <FAB.Group
            open={fabOpen}
            visible={true}
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
              {
                icon: 'message-plus-outline',
                label: 'Start New Chat',
                onPress: () => navigation.navigate('ModelSelection'),
              },
              {
                icon: 'account-group-outline',
                label: 'Create Room',
                onPress: () => navigation.navigate('RoomCreation'),
              },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            onPress={() => {
              if (fabOpen) { /* Close */ } else { /* Open */ }
            }}
            fabStyle={styles.fabStyle} 
            backdropColor="rgba(0, 0, 0, 0.3)"
          />
        </View>
      </Portal>
    </PaperProvider>
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
  listItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  roomModels: {
    fontSize: 12,
    color: COLORS.gray,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
  },
  fabStyle: {
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