import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../constants';
import { getModels, saveModels, getChats } from '../services/storage';
import { fetchModels } from '../services/api';
import { Model } from '../types';
import { RootStackParamList } from '../navigation';
import { MaterialIcons } from '@expo/vector-icons';
import { FILTER_VALUES } from '../constants';


// Define filter types using the constants
type PriceFilter = typeof FILTER_VALUES.ALL | typeof FILTER_VALUES.FREE | typeof FILTER_VALUES.PAID;
type ModalityFilter = typeof FILTER_VALUES.ALL | typeof FILTER_VALUES.TEXT | typeof FILTER_VALUES.MULTIMODAL;

type ModelSelectionScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ModelSelection'>;
  route: RouteProp<RootStackParamList, 'ModelSelection'>;
};

const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({
  navigation,
  route
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states using constants
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(FILTER_VALUES.ALL);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>(FILTER_VALUES.ALL);

  useEffect(() => {
    loadModels();
  }, []);

  // Apply all filters (search + price + modality)
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...models];

      // First apply search filter
      if (searchQuery.trim() !== '') {
        const lowercaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(model => {
          // Search by model name
          const nameMatch = model.name.toLowerCase().includes(lowercaseQuery);
          
          // Search by provider if it exists
          const providerMatch = model.provider ? 
            model.provider.toLowerCase().includes(lowercaseQuery) : 
            false;
          
          // Search by description if it exists
          const descriptionMatch = model.description ? 
            model.description.toLowerCase().includes(lowercaseQuery) : 
            false;
          
          return nameMatch || providerMatch || descriptionMatch;
        });
      }

      // Then apply price filter
      if (priceFilter !== FILTER_VALUES.ALL) {
        filtered = filtered.filter(model => {
          const isFree = isFreeModel(model);
          return (priceFilter === FILTER_VALUES.FREE && isFree) || (priceFilter === FILTER_VALUES.PAID && !isFree);
        });
      }

      // Finally apply modality filter
      if (modalityFilter !== FILTER_VALUES.ALL) {
        filtered = filtered.filter(model => {
          const isMultimodal = isMultimodalModel(model);
          return (modalityFilter === FILTER_VALUES.MULTIMODAL && isMultimodal) || 
                 (modalityFilter === FILTER_VALUES.TEXT && !isMultimodal);
        });
      }

      setFilteredModels(filtered);
      
      // Log filter results
      console.log(`Filter results: ${filtered.length}/${models.length} models shown`);
      console.log(`Active filters - Price: ${priceFilter}, Modality: ${modalityFilter}, Search: "${searchQuery}"`);
    };

    applyFilters();
  }, [searchQuery, models, priceFilter, modalityFilter]);

  // Helper function to check if a model is free
  const isFreeModel = (model: Model): boolean => {
    // Check if model ID contains 'free'
    if (model.id.includes(':free')) return true;
    
    // Check pricing structure
    if (model.pricing) {
      const prompt = model.pricing.prompt || '0';
      const completion = model.pricing.completion || '0';
      
      // If both prompt and completion are 0, it's free
      return prompt === '0' && completion === '0';
    }
    
    return false;
  };

  // Helper function to check if a model supports multimodal inputs
  const isMultimodalModel = (model: Model): boolean => {
    if (!model.architecture || !model.architecture.modality) return false;
    
    // If modality contains 'image', it's multimodal
    return model.architecture.modality.includes('image');
  };

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    
    // Log that we're using the constant-based filtering system
    console.log('ModelSelectionScreen using filter constants:', FILTER_VALUES);
    
    try {
      // First load cached models
      const cachedModels = await getModels();
      setModels(cachedModels);
      setFilteredModels(cachedModels); // Set filtered models initially to all models
      
      // Then try to fetch the latest models
      const fetchedModels = await fetchModels();
      if (fetchedModels && fetchedModels.length > 0) {
        setModels(fetchedModels);
        setFilteredModels(fetchedModels); // Update filtered models with fetched models
        await saveModels(fetchedModels);
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models. Using cached models.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSelectModel = async (model: Model) => {
    try {
      console.log('Model selected:', model);
      
      if (!model || !model.id || !model.name) {
        Alert.alert('Error', 'Invalid model data');
        return;
      }

      // Check if a chat with this model already exists
      const existingChats = await getChats();
      const existingChat = existingChats.find(chat => chat.modelId === model.id);
      
      // Prepare navigation parameters based on whether the chat exists or not
      const chatParams = existingChat 
        ? { chatId: existingChat.id }
        : { modelId: model.id, modelName: model.name };
      
      // Small delay before navigating to Chat to ensure smoother transitions
      setTimeout(() => {
        navigation.replace('Chat', chatParams);
      }, 50);
    } catch (error) {
      console.error('Error in handleSelectModel:', error);
      Alert.alert('Error', 'Failed to select model');
    }
  };
  
  // Render filter button with active/inactive styling
  const renderFilterButton = (
    label: string, 
    isActive: boolean, 
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isActive ? styles.activeFilterButton : {}
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterButtonText,
        isActive ? styles.activeFilterButtonText : {}
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderModelItem = ({ item }: { item: Model }) => (
    <TouchableOpacity
      style={styles.modelItem}
      onPress={() => handleSelectModel(item)}
    >
      <View style={styles.modelItemContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.modelImage} />
        ) : (
          <View style={styles.modelImagePlaceholder}>
            <Text style={styles.modelImagePlaceholderText}>
              {item.name.substring(0, 1)}
            </Text>
          </View>
        )}
        <View style={styles.modelInfo}>
          <Text style={styles.modelName}>
            {item.name}
            {isFreeModel(item) && <Text style={styles.freeTag}> (Free)</Text>}
          </Text>
          {item.provider && (
            <Text style={styles.modelProvider}>{item.provider}</Text>
          )}
          {item.description && (
            <Text style={styles.modelDescription} numberOfLines={2}>
              {item.description}
            </Text>
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
      </View>
    </TouchableOpacity>
  );

  if (loading && models.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading models...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search models..."
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

      {/* Filter section */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Price:</Text>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', priceFilter === FILTER_VALUES.ALL, () => {
                console.log('Price filter changed to: ALL');
                setPriceFilter(FILTER_VALUES.ALL);
              })}
              {renderFilterButton('Free', priceFilter === FILTER_VALUES.FREE, () => {
                console.log('Price filter changed to: FREE');
                setPriceFilter(FILTER_VALUES.FREE);
              })}
              {renderFilterButton('Paid', priceFilter === FILTER_VALUES.PAID, () => {
                console.log('Price filter changed to: PAID');
                setPriceFilter(FILTER_VALUES.PAID);
              })}
            </View>
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', modalityFilter === FILTER_VALUES.ALL, () => {
                console.log('Modality filter changed to: ALL');
                setModalityFilter(FILTER_VALUES.ALL);
              })}
              {renderFilterButton('Text Only', modalityFilter === FILTER_VALUES.TEXT, () => {
                console.log('Modality filter changed to: TEXT');
                setModalityFilter(FILTER_VALUES.TEXT);
              })}
              {renderFilterButton('Multimodal', modalityFilter === FILTER_VALUES.MULTIMODAL, () => {
                console.log('Modality filter changed to: MULTIMODAL');
                setModalityFilter(FILTER_VALUES.MULTIMODAL);
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {filteredModels.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No models match your filters</Text>
          <Text style={styles.emptySubText}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredModels}
          keyExtractor={(item) => item.id}
          renderItem={renderModelItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filtersScrollContent: {
    paddingHorizontal: 10,
  },
  filterGroup: {
    marginRight: 15,
  },
  filterLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: COLORS.lightGray,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  activeFilterButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  modelItem: {
    borderRadius: 10,
    backgroundColor: COLORS.white,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    padding: 10,
  },
  modelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
  },
  modelImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelImagePlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  modelInfo: {
    marginLeft: 15,
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  freeTag: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  modelProvider: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginRight: 5,
  },
  freeBadge: {
    backgroundColor: COLORS.secondary,
  },
  paidBadge: {
    backgroundColor: '#6c757d',
  },
  badgeIcon: {
    marginRight: 3,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
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
});

export default ModelSelectionScreen; 