import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput
} from 'react-native';
import { COLORS, FILTER_VALUES } from '../constants';
import { MaterialIcons } from '@expo/vector-icons';

const HORIZONTAL_PADDING = 16;

// Define filter types using the constants
export type PriceFilter = typeof FILTER_VALUES.ALL | typeof FILTER_VALUES.FREE | typeof FILTER_VALUES.PAID;
export type ModalityFilter = typeof FILTER_VALUES.ALL | typeof FILTER_VALUES.TEXT | typeof FILTER_VALUES.MULTIMODAL;

interface ModelFiltersProps {
  priceFilter: PriceFilter;
  modalityFilter: ModalityFilter;
  searchQuery: string;
  onPriceFilterChange: (filter: PriceFilter) => void;
  onModalityFilterChange: (filter: ModalityFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onResetFilters: () => void;
  showSearchBar?: boolean;
  topMargin?: number;
}

const ModelFilters: React.FC<ModelFiltersProps> = ({
  priceFilter,
  modalityFilter,
  searchQuery,
  onPriceFilterChange,
  onModalityFilterChange,
  onSearchQueryChange,
  onResetFilters,
  showSearchBar = true,
  topMargin = 0
}) => {
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

  return (
    <View style={[styles.container, { marginTop: topMargin }]}>
      {showSearchBar && (
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search models..."
            placeholderTextColor={COLORS.gray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchQueryChange('')}>
              <MaterialIcons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      )}

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
                onPriceFilterChange(FILTER_VALUES.ALL);
              })}
              {renderFilterButton('Free', priceFilter === FILTER_VALUES.FREE, () => {
                console.log('Price filter changed to: FREE');
                onPriceFilterChange(FILTER_VALUES.FREE);
              })}
              {renderFilterButton('Paid', priceFilter === FILTER_VALUES.PAID, () => {
                console.log('Price filter changed to: PAID');
                onPriceFilterChange(FILTER_VALUES.PAID);
              })}
            </View>
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', modalityFilter === FILTER_VALUES.ALL, () => {
                console.log('Modality filter changed to: ALL');
                onModalityFilterChange(FILTER_VALUES.ALL);
              })}
              {renderFilterButton('Text Only', modalityFilter === FILTER_VALUES.TEXT, () => {
                console.log('Modality filter changed to: TEXT');
                onModalityFilterChange(FILTER_VALUES.TEXT);
              })}
              {renderFilterButton('Multimodal', modalityFilter === FILTER_VALUES.MULTIMODAL, () => {
                console.log('Modality filter changed to: MULTIMODAL');
                onModalityFilterChange(FILTER_VALUES.MULTIMODAL);
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
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
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginBottom: 10,
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
});

export default ModelFilters; 