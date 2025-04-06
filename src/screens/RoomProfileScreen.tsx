import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation';
import { COLORS } from '../constants';
import { Room, Model, RoomModel } from '../types';
import { getRooms, saveRoom, getModels } from '../services/storage';

type RoomProfileScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'RoomProfile'>;
  route: RouteProp<RootStackParamList, 'RoomProfile'>;
};

const RoomProfileScreen: React.FC<RoomProfileScreenProps> = ({ navigation, route }) => {
  const { roomId, roomName } = route.params;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelSelectorVisible, setModelSelectorVisible] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    // Set the navigation title
    navigation.setOptions({
      title: roomName || 'Room Info',
    });

    loadRoomData();
  }, [roomId, navigation]);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading room data for:', roomId);
      const rooms = await getRooms();
      const currentRoom = rooms.find(r => r.id === roomId);
      
      if (currentRoom) {
        console.log('Room loaded:', currentRoom.name);
        setRoom(currentRoom);
      } else {
        console.error('Room not found:', roomId);
        setError('Room not found');
        // Navigate back after a short delay
        setTimeout(() => navigation.goBack(), 2000);
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

  const handleOpenModelSelector = () => {
    loadAvailableModels();
    setModelSelectorVisible(true);
  };

  const handleRemoveModel = async (modelId: string) => {
    if (!room) return;

    // Check if this is the last model in the room
    if (room.models.length <= 1) {
      Alert.alert(
        'Cannot Remove',
        'A room must have at least one model. Add another model before removing this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirm before removing
    Alert.alert(
      'Remove Model',
      'Are you sure you want to remove this model from the room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedModels = room.models.filter(model => model.id !== modelId);
            const updatedRoom: Room = {
              ...room,
              models: updatedModels
            };
            
            try {
              await saveRoom(updatedRoom);
              setRoom(updatedRoom);
            } catch (err) {
              console.error('Error removing model:', err);
              Alert.alert('Error', 'Failed to remove model from room');
            }
          }
        }
      ]
    );
  };

  const handleAddModel = async (model: Model) => {
    if (!room) return;

    // Check if model is already in the room
    if (room.models.some(m => m.id === model.id)) {
      Alert.alert('Model Already Added', 'This model is already in the room.');
      return;
    }

    const newRoomModel: RoomModel = {
      id: model.id,
      name: model.name
    };

    const updatedRoom: Room = {
      ...room,
      models: [...room.models, newRoomModel]
    };

    try {
      await saveRoom(updatedRoom);
      setRoom(updatedRoom);
      setModelSelectorVisible(false);
    } catch (err) {
      console.error('Error adding model:', err);
      Alert.alert('Error', 'Failed to add model to room');
    }
  };

  const renderModelItem = ({ item }: { item: Model }) => {
    // Only show models that aren't already in the room
    if (room?.models.some(m => m.id === item.id)) {
      return null;
    }
    
    return (
      <TouchableOpacity
        style={styles.modelSelectItem}
        onPress={() => handleAddModel(item)}
      >
        <Text style={styles.modelSelectName}>{item.name}</Text>
        <MaterialIcons name="add-circle" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading room details...</Text>
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error || 'Room details not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Room header section */}
      <View style={styles.headerSection}>
        <View style={styles.roomIconContainer}>
          <MaterialIcons name="group" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.roomName}>{room.name}</Text>
      </View>

      {/* Room statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Room Statistics</Text>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="message" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Total Messages</Text>
            <Text style={styles.infoValue}>{room.messages.length}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="smart-toy" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Models in Room</Text>
            <Text style={styles.infoValue}>{room.models.length}</Text>
          </View>
        </View>

        {room.lastMessageTime && (
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Activity</Text>
              <Text style={styles.infoValue}>
                {new Date(room.lastMessageTime).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Models section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Models</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenModelSelector}
          >
            <Text style={styles.addButtonText}>Add Model</Text>
          </TouchableOpacity>
        </View>

        {room.models.map(model => (
          <View key={model.id} style={styles.modelItem}>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>{model.name}</Text>
              <Text style={styles.modelId}>{model.id}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveModel(model.id)}
            >
              <MaterialIcons name="remove-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  headerSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  roomIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  roomId: {
    fontSize: 14,
    color: COLORS.gray,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 10,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  modelId: {
    fontSize: 12,
    color: COLORS.gray,
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
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
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: COLORS.gray,
  },
});

export default RoomProfileScreen; 