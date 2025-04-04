import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../constants';
import { getModels, saveModels, getChats } from '../services/storage';
import { fetchModels } from '../services/api';
import { Model } from '../types';
import { RootStackParamList } from '../navigation';
import { eventEmitter, EVENT_TYPES } from '../utils/events';

type ModelSelectionScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ModelSelection'>;
  route: RouteProp<RootStackParamList, 'ModelSelection'>;
};

const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({
  navigation,
  route
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First load cached models
      const cachedModels = await getModels();
      setModels(cachedModels);
      
      // Then try to fetch the latest models
      const fetchedModels = await fetchModels();
      if (fetchedModels && fetchedModels.length > 0) {
        setModels(fetchedModels);
        await saveModels(fetchedModels);
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models. Using cached models.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModel = async (model: Model) => {
    try {
      console.log('Model selected:', model);
      
      if (!model || !model.id || !model.name) {
        Alert.alert('Error', 'Invalid model data');
        return;
      }

      // Emit the model selected event for backward compatibility
      eventEmitter.emit(EVENT_TYPES.MODEL_SELECTED, model.id, model.name);
      
      // Direct navigation approach with existing chat check
      try {
        // Check if a chat with this model already exists
        const existingChats = await getChats();
        const existingChat = existingChats.find(chat => chat.modelId === model.id);
        
        if (existingChat) {
          console.log('Found existing chat for model:', model.id, 'Chat ID:', existingChat.id);
          // Navigate to the existing chat
          navigation.navigate('Chat', { chatId: existingChat.id });
        } else {
          console.log('No existing chat found for model:', model.id, 'Creating new chat');
          // Create a new chat
          navigation.navigate('Chat', {
            modelId: model.id,
            modelName: model.name
          });
        }
      } catch (navError) {
        console.error('Navigation error:', navError);
        Alert.alert('Navigation Error', 'Failed to navigate to chat screen');
      }
    } catch (error) {
      console.error('Error in handleSelectModel:', error);
      Alert.alert('Error', 'Failed to select model');
    }
  };

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
          <Text style={styles.modelName}>{item.name}</Text>
          {item.provider && (
            <Text style={styles.modelProvider}>{item.provider}</Text>
          )}
          {item.description && (
            <Text style={styles.modelDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
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
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={models}
        keyExtractor={(item) => item.id}
        renderItem={renderModelItem}
        contentContainerStyle={styles.listContent}
      />
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
  modelProvider: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default ModelSelectionScreen; 