import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, View } from 'react-native';
import { Menu, Provider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { initializeApiKey } from '../services/api';
import { StackNavigationProp } from '@react-navigation/stack';

// Import screen components with absolute paths
const ChatListScreen = require('../screens/ChatListScreen').default;
const ChatScreen = require('../screens/ChatScreen').default;
const ModelSelectionScreen = require('../screens/ModelSelectionScreen').default;
const SettingsScreen = require('../screens/SettingsScreen').default;
const ModelProfileScreen = require('../screens/ModelProfileScreen').default;
const RoomProfileScreen = require('../screens/RoomProfileScreen').default;
const AboutScreen = require('../screens/AboutScreen').default;
const RoomCreationScreen = require('../screens/RoomCreationScreen').default;
const RoomChatScreen = require('../screens/RoomChatScreen').default;

export type RootStackParamList = {
  ChatList: undefined;
  Chat: { chatId: string } | { modelId: string; modelName: string };
  RoomCreation: undefined;
  RoomChat: { roomId: string };
  RoomProfile: { roomId: string; roomName: string };
  ModelSelection: undefined;
  Settings: undefined;
  ModelProfile: { modelId: string; modelName: string };
  About: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Create a separate component for the header right menu button
type HeaderRightMenuProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ChatList'>;
};

const HeaderRightMenu: React.FC<HeaderRightMenuProps> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={{ marginRight: 15 }}
          >
            <MaterialIcons name="more-vert" size={24} color={COLORS.white} />
          </TouchableOpacity>
        }
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            navigation.navigate('Settings');
          }}
          title="Settings"
          leadingIcon="cog"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            navigation.navigate('About');
          }}
          title="About"
          leadingIcon="information-outline"
        />
      </Menu>
    </View>
  );
};

const AppNavigator = () => {
  console.log('Initializing AppNavigator');
  
  // Initialize the API key when the app starts
  React.useEffect(() => {
    initializeApiKey();
  }, []);
  
  return (
    <Provider>
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
              headerRight: () => <HeaderRightMenu navigation={navigation} />,
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
            options={{ title: 'Settings' }} 
          />
          <Stack.Screen 
            name="ModelProfile" 
            component={ModelProfileScreen} 
            options={{ title: 'Model Info' }} 
          />
          <Stack.Screen 
            name="RoomProfile" 
            component={RoomProfileScreen} 
            options={{ title: 'Room Info' }} 
          />
          <Stack.Screen 
            name="About" 
            component={AboutScreen} 
            options={{ title: 'About' }} 
          />
          <Stack.Screen 
            name="RoomCreation" 
            component={RoomCreationScreen} 
            options={{ title: 'Create Room' }} 
          />
          <Stack.Screen 
            name="RoomChat" 
            component={RoomChatScreen} 
            options={() => ({ 
              headerShown: true
            })} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

export default AppNavigator; 