import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { COLORS } from './src/constants';
import AppNavigator from './src/navigation';
import 'react-native-gesture-handler';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={COLORS.primary} 
        />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
