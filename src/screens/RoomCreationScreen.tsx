import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Model, RoomModel } from '../types';
import { getModels, saveRoom } from '../services/storage'; // Reverted import path
import { COLORS } from '../constants';
import { RootStackParamList } from '../navigation';

// Add a custom ID generator function
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type RoomCreationScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'RoomCreation'>;
  route: RouteProp<RootStackParamList, 'RoomCreation'>;
};

const RoomCreationScreen: React.FC<RoomCreationScreenProps> = ({ navigation }) => {
  const [roomName, setRoomName] = useState('');
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<RoomModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Verify or implement getModels if it doesn't exist or fetch from API
      const models = await getModels(); 
      setAvailableModels(models);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load available models.');
      Alert.alert('Error', 'Could not load models. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleModelSelection = (model: Model) => {
    const modelInfo: RoomModel = { id: model.id, name: model.name };
    setSelectedModels(prevSelected => 
      prevSelected.some(m => m.id === model.id) 
        ? prevSelected.filter(m => m.id !== model.id)
        : [...prevSelected, modelInfo]
    );
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the room.');
      return;
    }
    if (selectedModels.length === 0) {
      Alert.alert('No Models Selected', 'Please select at least one model for the room.');
      return;
    }

    setLoading(true);
    try {
      // Generate a unique ID for the room using our custom function
      const roomId = generateId();
      
      const newRoom = {
        id: roomId,
        name: roomName.trim(),
        models: selectedModels,
        messages: [], // Start with an empty message list
      };

      await saveRoom(newRoom);
      console.log('Room created successfully:', newRoom.id);
      
      // Navigate to the newly created RoomChatScreen
      navigation.replace('RoomChat', { roomId: newRoom.id }); 

    } catch (err) {
      console.error('Error creating room:', err);
      Alert.alert('Error', 'Failed to create the room. Please try again.');
      setLoading(false);
    }
    // No need to setLoading(false) here if navigation replaces the screen
  };

  const renderModelItem = ({ item }: { item: Model }) => {
    const isSelected = selectedModels.some(m => m.id === item.id);
    return (
      <TouchableOpacity 
        style={[styles.modelItem, isSelected && styles.modelItemSelected]}
        onPress={() => toggleModelSelection(item)}
      >
        <Text style={styles.modelName}>{item.name}</Text>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && availableModels.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text>Loading models...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadAvailableModels} style={styles.retryButton}>
           <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Room Name</Text>
      <TextInput
        style={styles.input}
        value={roomName}
        onChangeText={setRoomName}
        placeholder="Enter a name for your room"
        placeholderTextColor={COLORS.gray}
      />

      <Text style={styles.label}>Select Models (Select at least one)</Text>
      <FlatList
        data={availableModels}
        renderItem={renderModelItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyListText}>No models available.</Text>}
      />

      <TouchableOpacity 
        style={[styles.createButton, (loading || selectedModels.length === 0 || !roomName.trim()) && styles.createButtonDisabled]} 
        onPress={handleCreateRoom}
        disabled={loading || selectedModels.length === 0 || !roomName.trim()}
      >
        {loading ? (
           <ActivityIndicator color={COLORS.white} />
        ) : (
           <Text style={styles.createButtonText}>Create Room</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
     backgroundColor: COLORS.primary,
     paddingVertical: 10,
     paddingHorizontal: 20,
     borderRadius: 5,
  },
  retryButtonText: {
      color: COLORS.white,
      fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.gray,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  list: {
    flex: 1,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modelItemSelected: {
    backgroundColor: COLORS.lightGray,
  },
  modelName: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
  },
  checkboxMark: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.gray,
  },
});

export default RoomCreationScreen; 