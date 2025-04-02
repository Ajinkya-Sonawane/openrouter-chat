import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, URLS } from '../constants';
import { getApiKey, saveApiKey, clearApiKey } from '../services/settings';
import { refreshApiKey } from '../services/api';
import { clearAllChats } from '../services/storage';
import { RootStackParamList } from '../navigation';

type SettingsScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Settings'>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const storedApiKey = await getApiKey();
      setApiKey(storedApiKey);
      setError(null);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await saveApiKey(apiKey.trim());
      await refreshApiKey();
      
      Alert.alert('Success', 'API key saved successfully!');
    } catch (err) {
      console.error('Error saving API key:', err);
      setError('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your API key? You will not be able to send messages to AI models without an API key.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Key', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              setError(null);
              
              await clearApiKey();
              await refreshApiKey();
              setApiKey('');
              
              Alert.alert('Success', 'API key cleared successfully');
            } catch (err) {
              console.error('Error clearing API key:', err);
              setError('Failed to clear API key');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleGetApiKey = () => {
    Linking.openURL(URLS.OPENROUTER_KEYS_PAGE);
  };

  const handleClearAllChats = () => {
    Alert.alert(
      'Clear All Chats',
      'Are you sure you want to delete all your chats? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearAllChats();
              Alert.alert('Success', 'All chats have been cleared');
            } catch (err) {
              console.error('Error clearing chats:', err);
              setError('Failed to clear chats');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Settings</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              OpenRouter is a unified API that gives you access to 100+ LLMs from top providers. 
              You need an API key to send messages to the models.
            </Text>
          </View>
          
          <Text style={styles.label}>OpenRouter API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter your OpenRouter API key"
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.getKeyButton}
              onPress={handleGetApiKey}
            >
              <Text style={styles.getKeyButtonText}>Get API Key</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, !apiKey.trim() && styles.saveButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={!apiKey.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {apiKey.trim() && (
            <TouchableOpacity
              style={styles.clearKeyButton}
              onPress={handleClearApiKey}
            >
              <Text style={styles.clearKeyButtonText}>Clear API Key</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Manage your chat history and app data. Clearing all chats will permanently delete your conversation history.
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearAllChats}
          >
            <Text style={styles.dangerButtonText}>Clear All Chats</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  errorText: {
    color: '#cc0000',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.secondary,
  },
  infoBox: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.black,
  },
  version: {
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.black,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  getKeyButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flex: 1,
    alignItems: 'center',
  },
  getKeyButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearKeyButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dc3545',
    alignItems: 'center',
  },
  clearKeyButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SettingsScreen; 