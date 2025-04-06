import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Model, RoomModel } from '../types';
import { getModels, saveRoom } from '../services/storage';
import { COLORS, FILTER_VALUES } from '../constants';
import { RootStackParamList } from '../navigation';
import { MaterialIcons } from '@expo/vector-icons';
import ModelFilters, { PriceFilter, ModalityFilter } from '../components/ModelFilters';
import { isFreeModel, isMultimodalModel, applyModelFilters } from '../utils/modelFilters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CONTENT_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

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
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<RoomModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states using constants
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(FILTER_VALUES.ALL);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>(FILTER_VALUES.ALL);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAvailableModels();
  }, []);

  // Apply filters whenever filter states or available models change
  useEffect(() => {
    const filtered = applyModelFilters(availableModels, searchQuery, priceFilter, modalityFilter);
    setFilteredModels(filtered);
  }, [priceFilter, modalityFilter, searchQuery, availableModels]);

  const loadAvailableModels = async () => {
    setLoading(true);
    setError(null);
    try {
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
      const roomId = generateId();
      
      const newRoom = {
        id: roomId,
        name: roomName.trim(),
        models: selectedModels,
        messages: [],
      };

      await saveRoom(newRoom);
      console.log('Room created successfully:', newRoom.id);
      
      navigation.replace('RoomChat', { roomId: newRoom.id }); 

    } catch (err) {
      console.error('Error creating room:', err);
      Alert.alert('Error', 'Failed to create the room. Please try again.');
      setLoading(false);
    }
  };

  const renderModelItem = ({ item }: { item: Model }) => {
    const isSelected = selectedModels.some(m => m.id === item.id);
    return (
      <TouchableOpacity 
        style={[styles.modelItem, isSelected && styles.modelItemSelected]}
        onPress={() => toggleModelSelection(item)}
      >
        <View style={styles.modelItemContent}>
          <Text style={styles.modelName}>
            {item.name}
            {isFreeModel(item) && <Text style={styles.freeTag}> (Free)</Text>}
          </Text>
          {item.provider && (
            <Text style={styles.modelProvider}>{item.provider}</Text>
          )}
          {item.description && (
            <Text style={styles.modelDescription} numberOfLines={2}>{item.description}</Text>
          )}
          {/* Model badges */}
          <View style={styles.badgeContainer}>
            {isMultimodalModel(item) ? (
              <View style={styles.badge}>
                <MaterialIcons name="image" size={12} color={COLORS.white} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>Image</Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <MaterialIcons name="text-fields" size={12} color={COLORS.white} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>Text</Text>
              </View>
            )}
            
            {isFreeModel(item) ? (
              <View style={[styles.badge, styles.freeBadge]}>
                <MaterialIcons name="check-circle" size={12} color={COLORS.white} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>Free</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.paidBadge]}>
                <MaterialIcons name="attach-money" size={12} color={COLORS.white} style={styles.badgeIcon} />
                <Text style={styles.badgeText}>Paid</Text>
              </View>
            )}
          </View>
        </View>
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.label}>Room Name</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Enter a name for your room"
          placeholderTextColor={COLORS.gray}
        />

        <ModelFilters
          priceFilter={priceFilter}
          modalityFilter={modalityFilter}
          searchQuery={searchQuery}
          onPriceFilterChange={setPriceFilter}
          onModalityFilterChange={setModalityFilter}
          onSearchQueryChange={setSearchQuery}
          onResetFilters={() => {
            setPriceFilter(FILTER_VALUES.ALL);
            setModalityFilter(FILTER_VALUES.ALL);
            setSearchQuery('');
          }}
          topMargin={0}
        />

        <Text style={styles.label}>Select Models (Select at least one)</Text>
        <FlatList
          data={filteredModels}
          renderItem={renderModelItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <MaterialIcons name="search-off" size={40} color={COLORS.gray} />
              <Text style={styles.emptyListText}>No models match your filters.</Text>
              <TouchableOpacity 
                style={styles.resetFiltersButton}
                onPress={() => {
                  setPriceFilter(FILTER_VALUES.ALL);
                  setModalityFilter(FILTER_VALUES.ALL);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          }
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.white,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: HORIZONTAL_PADDING,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.gray,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelItemContent: {
    flex: 1,
    marginRight: 16,
  },
  modelItemSelected: {
    backgroundColor: COLORS.lightGray,
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: COLORS.black,
  },
  freeTag: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  modelProvider: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 6,
  },
  modelDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
    lineHeight: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  freeBadge: {
    backgroundColor: COLORS.secondary,
  },
  paidBadge: {
    backgroundColor: '#6c757d',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyListContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyListText: {
    color: COLORS.gray,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  resetFiltersButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  resetFiltersText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RoomCreationScreen; 