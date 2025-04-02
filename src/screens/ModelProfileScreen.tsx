import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation';
import { COLORS, URLS } from '../constants';
import { fetchModelDetails } from '../services/api';
import { Model } from '../types';

type ModelProfileScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ModelProfile'>;
  route: RouteProp<RootStackParamList, 'ModelProfile'>;
};

const ModelProfileScreen: React.FC<ModelProfileScreenProps> = ({ navigation, route }) => {
  const { modelId, modelName } = route.params;
  const [modelDetails, setModelDetails] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set the navigation title
    navigation.setOptions({
      title: 'Model Info',
    });

    // Fetch model details
    const loadModelDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const details = await fetchModelDetails(modelId);
        setModelDetails(details);
      } catch (err) {
        console.error('Error fetching model details:', err);
        setError('Failed to load model details');
      } finally {
        setLoading(false);
      }
    };

    loadModelDetails();
  }, [modelId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading model details...</Text>
      </View>
    );
  }

  if (error || !modelDetails) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error || 'Model details not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format pricing information
  const formatPricing = (price: string) => {
    return price === '0' ? 'Free' : `$${parseFloat(price).toFixed(6)} / 1K tokens`;
  };

  // Get pricing info
  const pricing = modelDetails.pricing || {};
  const promptPrice = pricing.prompt || '0';
  const completionPrice = pricing.completion || '0';

  return (
    <ScrollView style={styles.container}>
      {/* Model header section */}
      <View style={styles.headerSection}>
        <View style={styles.modelImageContainer}>
          {modelDetails.image ? (
            <Image 
              source={{ uri: modelDetails.image }} 
              style={styles.modelImage} 
              resizeMode="contain"
            />
          ) : (
            <View style={styles.modelImagePlaceholder}>
              <Text style={styles.modelImagePlaceholderText}>
                {modelName.substring(0, 1)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.modelName}>{modelName}</Text>
        <Text style={styles.modelId}>{modelId}</Text>
      </View>

      {/* Model description */}
      {modelDetails.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{modelDetails.description}</Text>
        </View>
      )}

      {/* Model specifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specifications</Text>

        <View style={styles.infoRow}>
          <MaterialIcons name="memory" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Context Length</Text>
            <Text style={styles.infoValue}>
              {modelDetails.context_length?.toLocaleString() || 'N/A'} tokens
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="text-box-outline" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Architecture</Text>
            <Text style={styles.infoValue}>
              {modelDetails.architecture?.modality || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="date-range" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {modelDetails.created 
                ? new Date(modelDetails.created * 1000).toLocaleDateString() 
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Pricing information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="input" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Prompt</Text>
            <Text style={styles.infoValue}>{formatPricing(promptPrice)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="output" size={20} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Completion</Text>
            <Text style={styles.infoValue}>{formatPricing(completionPrice)}</Text>
          </View>
        </View>
      </View>

      {/* Provider information if available */}
      {modelDetails.top_provider && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider Information</Text>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Moderation</Text>
              <Text style={styles.infoValue}>
                {modelDetails.top_provider.is_moderated ? 'Moderated' : 'Not Moderated'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* OpenRouter link */}
      <TouchableOpacity 
        style={styles.openRouterLink}
        onPress={() => Linking.openURL(`${URLS.OPENROUTER_MODEL_PAGE}/${modelId}`)}
      >
        <Text style={styles.openRouterLinkText}>View on OpenRouter</Text>
        <MaterialIcons name="open-in-new" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    marginTop: 10,
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.primary,
  },
  modelImageContainer: {
    marginBottom: 15,
  },
  modelImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
  },
  modelImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelImagePlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modelId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.black,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.black,
  },
  openRouterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  openRouterLinkText: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 5,
    fontWeight: '500',
  },
});

export default ModelProfileScreen; 