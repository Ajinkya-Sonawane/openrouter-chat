import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform
} from 'react-native';
import { COLORS } from '../constants';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  loading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  loading
}) => {
  const [messageText, setMessageText] = useState('');

  const handleSend = () => {
    if (messageText.trim() && !loading) {
      onSendMessage(messageText);
      setMessageText('');
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Type a message..."
        multiline
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={handleSend}
      />
      {loading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.sendButton}
        />
      ) : (
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: COLORS.white,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default MessageInput; 