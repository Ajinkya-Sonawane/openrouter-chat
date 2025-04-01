import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { COLORS } from '../constants';
import { Message } from '../types';
import FormattedText from './FormattedText';
import { MaterialIcons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: Message;
  onContentRendered?: () => void;
  onExpansionChange?: (expanded: boolean, messageId: string) => void;
}

const MAX_BUBBLE_HEIGHT = 300; // Maximum height for large message bubbles

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onContentRendered,
  onExpansionChange 
}) => {
  const isUser = message.role === 'user';
  const [contentHeight, setContentHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [initialMeasurementComplete, setInitialMeasurementComplete] = useState(false);
  const hasNotifiedRef = useRef(false);
  const contentRef = useRef<View>(null);
  const messageIdRef = useRef(message.id);

  // Handle copying message content to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(message.content);
      Toast.show({
        type: 'success',
        text1: 'Copied to clipboard',
        position: 'bottom',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to copy message',
        position: 'bottom',
        visibilityTime: 2000,
      });
    }
  }, [message.content]);

  // Memoize the toggle function to prevent recreating it on every render
  // Now also notifies parent about expansion change
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => {
      const newState = !prev;
      // Notify parent component about expansion state change
      if (onExpansionChange) {
        onExpansionChange(newState, message.id);
      }
      return newState;
    });
  }, [message.id, onExpansionChange]);

  // Handle layout event only once per message unless expanded state changes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    const width = event.nativeEvent.layout.width;

    if (!initialMeasurementComplete || messageIdRef.current !== message.id) {
      console.log(`MessageBubble layout event - height: ${height}, width: ${width}`);
      
      setContentHeight(height);
      setHasOverflow(height > MAX_BUBBLE_HEIGHT);
      setInitialMeasurementComplete(true);
      messageIdRef.current = message.id;
      
      // Only notify once per message to prevent render loops
      if (onContentRendered && !isUser && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        onContentRendered();
      }
    }
  }, [message.id, initialMeasurementComplete, isUser, onContentRendered]);

  // Reset state when message changes
  useEffect(() => {
    if (messageIdRef.current !== message.id) {
      console.log('Message ID changed, resetting state');
      setInitialMeasurementComplete(false);
      setContentHeight(0);
      setHasOverflow(false);
      setExpanded(false);
      hasNotifiedRef.current = false;
      messageIdRef.current = message.id;
    }
  }, [message.id]);

  // Add a log when rendering the component
  console.log(`Rendering message: ${message.id}, role: ${message.role}, content length: ${message.content.length}`);

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <View style={styles.bubbleHeader}>
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={copyToClipboard}
          accessibilityLabel="Copy message"
        >
          <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <View 
        ref={contentRef}
        style={[
          expanded ? null : { maxHeight: hasOverflow ? MAX_BUBBLE_HEIGHT : undefined },
          { overflow: 'hidden' }
        ]} 
        onLayout={handleLayout}
      >
        {isUser ? (
          <Text style={styles.messageText}>{message.content}</Text>
        ) : (
          <FormattedText 
            text={message.content} 
            style={styles.messageText}
          />
        )}
      </View>
      
      {hasOverflow && (
        <TouchableOpacity 
          style={styles.expandButton} 
          onPress={toggleExpanded}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : 'Show More'}
          </Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.messageTime}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '85%', // Slightly wider to prevent wrapping issues
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.bubble.user,
    borderTopRightRadius: 0,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bubble.assistant,
    borderTopLeftRadius: 0,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.gray,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  expandButton: {
    paddingVertical: 5,
    alignItems: 'center',
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  expandButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 12,
  },
});

export default MessageBubble;
