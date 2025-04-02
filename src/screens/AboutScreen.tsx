import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, URLS } from '../constants';
import { RootStackParamList } from '../navigation';

// Import the logo image
const logoImage = require('../../assets/small-logo.png');

type AboutScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'About'>;
};

const APP_VERSION = '1.0.0'; // Update with your app version

const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>OpenRouterChat</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            OpenRouterChat is a mobile application that allows you to chat with various AI models through the OpenRouter API.
            The app provides a clean and intuitive interface for interacting with cutting-edge AI models from various providers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureRow}>
            <MaterialIcons name="chat" size={20} color={COLORS.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Multi-Model Support</Text>
              <Text style={styles.featureDescription}>
                Access multiple AI models from providers like OpenAI, Anthropic, Google, and more.
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <MaterialIcons name="text-format" size={20} color={COLORS.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Rich Text Formatting</Text>
              <Text style={styles.featureDescription}>
                View AI responses with full markdown formatting, including code blocks, lists, and more.
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <MaterialIcons name="history" size={20} color={COLORS.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Chat History</Text>
              <Text style={styles.featureDescription}>
                Save and retrieve past conversations for continued interactions.
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <MaterialIcons name="info" size={20} color={COLORS.primary} />
            <View style={styles.featureContent}>
              <Text style={styles.featureLabel}>Model Information</Text>
              <Text style={styles.featureDescription}>
                Access detailed information about each AI model, including capabilities and pricing.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(URLS.GITHUB_REPO)}
          >
            <MaterialIcons name="code" size={20} color={COLORS.primary} />
            <Text style={styles.linkButtonText}>View on GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(URLS.OPENROUTER_HOMEPAGE)}
          >
            <MaterialIcons name="link" size={20} color={COLORS.primary} />
            <Text style={styles.linkButtonText}>OpenRouter Website</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} OpenRouterChat
          </Text>
          <Text style={styles.footerText}>
            Built with React Native and Expo
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  logoContainer: {
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  version: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.black,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  featureContent: {
    marginLeft: 15,
    flex: 1,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
    color: COLORS.black,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginBottom: 10,
  },
  linkButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 5,
  },
});

export default AboutScreen; 