import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../constants';
import { fetchModels } from '../services/api';
import { DEFAULT_MODELS } from '../constants';

interface ModelSwitchProps {
  currentModelId: string;
  onModelSelect: (modelId: string, modelName: string) => void;
  isRateLimitError?: boolean;
}

interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  image?: string;
}

const ModelSwitch: React.FC<ModelSwitchProps> = ({ currentModelId, onModelSelect, isRateLimitError = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modalVisible) {
      loadModels();
    }
  }, [modalVisible]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedModels = await fetchModels();
      setModels(fetchedModels || DEFAULT_MODELS);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models');
      setModels(DEFAULT_MODELS);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (modelId: string, modelName: string) => {
    onModelSelect(modelId, modelName);
    setModalVisible(false);
  };

  const renderModelItem = ({ item }: { item: Model }) => (
    <TouchableOpacity
      style={[
        styles.modelItem,
        currentModelId === item.id && styles.selectedModelItem
      ]}
      onPress={() => handleModelSelect(item.id, item.name)}
    >
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{item.name}</Text>
        {item.provider && (
          <Text style={styles.modelProvider}>{item.provider}</Text>
        )}
      </View>
      {currentModelId === item.id && (
        <View style={styles.selectedIndicator} />
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.switchButtonText}>
          {isRateLimitError ? "New Chat with Different Model" : "Change Model"}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isRateLimitError ? "Start New Chat with Model" : "Select a Model"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isRateLimitError && (
              <View style={styles.rateLimitInfoContainer}>
                <Text style={styles.rateLimitInfoText}>
                  Due to rate limits on the current model, you'll start a new chat with your selected model.
                </Text>
              </View>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading models...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadModels}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={models}
                renderItem={renderModelItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modelList}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  switchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  switchButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.gray,
  },
  modelList: {
    padding: 8,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  selectedModelItem: {
    backgroundColor: COLORS.lightGray,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modelProvider: {
    fontSize: 14,
    color: COLORS.gray,
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  rateLimitInfoContainer: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  rateLimitInfoText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});

export default ModelSwitch; 