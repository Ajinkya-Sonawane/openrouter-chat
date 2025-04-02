import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants';
import { initializeApiKey } from '../services/api';

// Import screen components with absolute paths
const ChatListScreen = require('../screens/ChatListScreen').default;
const ChatScreen = require('../screens/ChatScreen').default;
const ModelSelectionScreen = require('../screens/ModelSelectionScreen').default;
const SettingsScreen = require('../screens/SettingsScreen').default;
const ModelProfileScreen = require('../screens/ModelProfileScreen').default;

export type RootStackParamList = {
  ChatList: undefined;
  Chat: { chatId: string } | { modelId: string; modelName: string };
  ModelSelection: undefined;
  Settings: undefined;
  ModelProfile: { modelId: string; modelName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  console.log('Initializing AppNavigator');
  
  // Initialize the API key when the app starts
  React.useEffect(() => {
    initializeApiKey();
  }, []);
  
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ChatList"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen} 
          options={({ navigation }) => ({
            title: 'OpenRouterChat',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={{ marginRight: 15 }}
              >
                <Ionicons name="settings-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={({ route }) => ({ 
            title: (route.params as { modelName: string }).modelName || 'Chat'
          })} 
        />
        <Stack.Screen 
          name="ModelSelection" 
          component={ModelSelectionScreen} 
          options={{ title: 'Select a Model' }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ 
            title: 'Settings',
          }} 
        />
        <Stack.Screen 
          name="ModelProfile" 
          component={ModelProfileScreen} 
          options={{ 
            title: 'Model Info',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 