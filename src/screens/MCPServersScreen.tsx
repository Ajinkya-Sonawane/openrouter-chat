import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS } from '../constants';
import { getMCPServers, saveMCPServer, deleteMCPServer } from '../services/storage';
import { MCPServer } from '../types';
import { RootStackParamList } from '../navigation';
import eventEmitter, { EVENTS } from '../services/events';
import { MaterialIcons } from '@expo/vector-icons';

type MCPServersScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'MCPServers'>;
};

const MCPServersScreen: React.FC<MCPServersScreenProps> = ({ navigation }) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadServers();
    
    // Listen for server updates
    const unsubscribe = eventEmitter.on(
      EVENTS.MCP_SERVERS_UPDATED,
      (updatedServers: MCPServer[]) => {
        setServers(updatedServers);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadServers = async () => {
    try {
      const loadedServers = await getMCPServers();
      setServers(loadedServers);
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      Alert.alert('Error', 'Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async () => {
    if (!editingServer) return;

    try {
      if (!editingServer.name.trim()) {
        Alert.alert('Error', 'Server name is required');
        return;
      }

      if (!editingServer.url.trim()) {
        Alert.alert('Error', 'Server URL is required');
        return;
      }

      // Validate URL format
      try {
        new URL(editingServer.url);
      } catch {
        Alert.alert('Error', 'Invalid URL format');
        return;
      }

      await saveMCPServer(editingServer);
      setEditingServer(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error saving MCP server:', error);
      Alert.alert('Error', 'Failed to save MCP server');
    }
  };

  const handleDeleteServer = async (server: MCPServer) => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to delete ${server.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMCPServer(server.id);
            } catch (error) {
              console.error('Error deleting MCP server:', error);
              Alert.alert('Error', 'Failed to delete MCP server');
            }
          },
        },
      ]
    );
  };

  const renderServerForm = () => {
    if (!editingServer) return null;

    return (
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Server Name"
          value={editingServer.name}
          onChangeText={(text) => setEditingServer({ ...editingServer, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Server URL"
          value={editingServer.url}
          onChangeText={(text) => setEditingServer({ ...editingServer, url: text })}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          style={styles.input}
          placeholder="API Key (optional)"
          value={editingServer.apiKey}
          onChangeText={(text) => setEditingServer({ ...editingServer, apiKey: text })}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={editingServer.description}
          onChangeText={(text) => setEditingServer({ ...editingServer, description: text })}
          multiline
          numberOfLines={3}
        />
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Enabled</Text>
          <Switch
            value={editingServer.isEnabled}
            onValueChange={(value) => setEditingServer({ ...editingServer, isEnabled: value })}
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              setEditingServer(null);
              setIsAddingNew(false);
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveServer}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderServerItem = (server: MCPServer) => (
    <View key={server.id} style={styles.serverItem}>
      <View style={styles.serverInfo}>
        <Text style={styles.serverName}>{server.name}</Text>
        <Text style={styles.serverUrl}>{server.url}</Text>
        {server.description && (
          <Text style={styles.serverDescription}>{server.description}</Text>
        )}
        <View style={styles.serverStatus}>
          <View style={[styles.statusDot, { backgroundColor: server.isEnabled ? COLORS.success : COLORS.error }]} />
          <Text style={styles.statusText}>{server.isEnabled ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>
      <View style={styles.serverActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setEditingServer(server)}
        >
          <MaterialIcons name="edit" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteServer(server)}
        >
          <MaterialIcons name="delete" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {renderServerForm()}
        {!editingServer && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingServer({
                id: Math.random().toString(36).substring(2, 15),
                name: '',
                url: '',
                isEnabled: true
              });
              setIsAddingNew(true);
            }}
          >
            <MaterialIcons name="add" size={24} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add MCP Server</Text>
          </TouchableOpacity>
        )}
        {servers.map(renderServerItem)}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  serverItem: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serverUrl: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  serverDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  serverActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
});

export default MCPServersScreen; 