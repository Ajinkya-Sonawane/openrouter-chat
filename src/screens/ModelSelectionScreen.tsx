import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Dimensions,
  SafeAreaView
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
import ModelFilters, { PriceFilter, ModalityFilter } from '../components/ModelFilters';
import { isFreeModel, isMultimodalModel, applyModelFilters } from '../utils/modelFilters';

type ModelSelectionScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ModelSelection'>;
  route: RouteProp<RootStackParamList, 'ModelSelection'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CONTENT_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({
  navigation,
  route
}) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
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

  const handleModelSelection = (model: Model) => {
    navigation.navigate('Chat', { modelId: model.id, modelName: model.name });
  };

  const renderModelItem = ({ item }: { item: Model }) => (
    <TouchableOpacity 
      style={styles.modelItem}
      onPress={() => handleModelSelection(item)}
    >
      <View style={styles.modelIconContainer}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.modelImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.modelImagePlaceholder}>
            <Text style={styles.modelImagePlaceholderText}>
              {item.name.substring(0, 1)}
            </Text>
          </View>
        )}
      </View>
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
      <MaterialIcons name="chevron-right" size={24} color={COLORS.gray} />
    </TouchableOpacity>
  );

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
        <View style={styles.searchContainer}>
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
          />
        </View>
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 20,
  },
  modelItem: {
    flexDirection: 'row',
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
  modelIconContainer: {
    width: 50,
    height: 50,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  modelItemContent: {
    flex: 1,
    marginRight: 16,
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
  resetFiltersText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ModelSelectionScreen; 