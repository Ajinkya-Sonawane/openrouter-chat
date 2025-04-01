import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Text, View, StyleSheet, Linking, StyleProp, TextStyle, ScrollView, Image, LayoutChangeEvent } from 'react-native';
import { COLORS } from '../constants';

/**
 * FormattedText Component
 * -----------------------
 * A component that renders text with markdown-style formatting.
 * 
 * Supported formatting:
 * - **Bold**: Use **text** or __text__
 * - *Italic*: Use *text* or _text_
 * - ~~Strikethrough~~: Use ~~text~~
 * - `Inline code`: Use `code`
 * - [Links](https://example.com): Use [text](url)
 * - Code blocks: Use ```language
 *                    code
 *                    ```
 * - # Headers: Use # Header (levels 1-6)
 * - > Blockquotes: Use > text
 * - Lists:
 *   * Bullet lists: Use * item or - item
 *   * Numbered lists: Use 1. item, 2. item
 *   * Nested lists: Indent with spaces
 * - Tables: Use | Header | Header |
 *                | ----- | ----- |
 *                | Cell  | Cell  |
 * - Images: Use ![alt](url) or ![alt](url "caption")
 * - Horizontal rules: Use --- or *** or ___
 */

interface FormattedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  onContentRendered?: () => void;
}

interface ListItem {
  content: string;
  level: number;
  isBulletList: boolean;
  isNumberedList: boolean;
  bulletOrNumber: string;
}

interface TableCell {
  content: string;
  isHeader: boolean;
}

// Define types for our content blocks
interface TextBlock {
  type: 'text';
  content: string;
}

interface CodeBlock {
  type: 'codeBlock';
  language: string;
  content: string;
}

type ContentBlock = TextBlock | CodeBlock;

// Memoize the FormattedText component to prevent unnecessary re-renders
const FormattedText: React.FC<FormattedTextProps> = memo(({ text, style, onContentRendered }) => {
  if (!text) return null;

  // Track loaded images to ensure we render everything before scrolling
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [contentRendered, setContentRendered] = useState(false);
  const hasNotifiedRef = useRef(false);
  const textRef = useRef(text);

  // Count total images in the content - only do this once when text changes
  useEffect(() => {
    // Skip if the text hasn't actually changed
    if (textRef.current === text) return;
    
    const imageMatches = text.match(/!\[.*?\]\(.*?\)/g);
    const count = imageMatches ? imageMatches.length : 0;
    console.log(`FormattedText: Detected ${count} images in content`);
    setTotalImages(count);
    setImagesLoaded(0); // Reset image count
    setContentRendered(false); // Reset render state
    hasNotifiedRef.current = false; // Reset notification state
    textRef.current = text; // Update reference
    
    return () => {
      // Clean up
      hasNotifiedRef.current = false;
    };
  }, [text]);
  
  // Notify parent when all images are loaded and content is rendered - but only once
  useEffect(() => {
    if (!onContentRendered || hasNotifiedRef.current) return;
    
    if ((imagesLoaded === totalImages || totalImages === 0) && contentRendered) {
      console.log('FormattedText: All content rendered, notifying parent once');
      hasNotifiedRef.current = true;
      
      // Single delayed notification for complex layout
      const timer = setTimeout(() => {
        onContentRendered();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [imagesLoaded, totalImages, contentRendered, onContentRendered]);

  // Notify that initial layout is done - memoize the callback
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (!contentRendered) {
      console.log(`FormattedText: Layout event - height: ${event.nativeEvent.layout.height}, width: ${event.nativeEvent.layout.width}`);
      setContentRendered(true);
    }
  }, [contentRendered]);

  // Handle image load completion - memoize the callback
  const handleImageLoaded = useCallback(() => {
    console.log('FormattedText: Image loaded successfully');
    setImagesLoaded(prev => prev + 1);
  }, []);

  // Identify code blocks - memoize result to prevent recreation on every render
  const textWithCodeBlocks = React.useMemo(() => {
    const blocks: ContentBlock[] = [];
    const codeBlockRegex = /```(?:([a-zA-Z0-9]+)\n)?([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add code block with empty language string if undefined
      blocks.push({
        type: 'codeBlock',
        content: match[2],
        language: match[1] || ''
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      blocks.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return blocks;
  }, [text]);

  // Process all lines to detect lists and their nesting levels
  const processLists = useCallback((lines: string[]) => {
    // First pass: Identify list items and their indentation levels
    const processedLines: {
      line: string;
      isListItem: boolean;
      isBulletList: boolean;
      isNumberedList: boolean;
      level: number;
      content: string;
      index: number;
      bulletOrNumber: string;
    }[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Calculate indentation level (number of spaces at the beginning)
      const spaces = line.match(/^(\s*)/)?.[1].length || 0;
      const level = Math.floor(spaces / 2); // Every 2 spaces = 1 level of indentation
      
      // Check for bullet lists
      const bulletMatch = trimmedLine.match(/^(-|\*)\s+(.*)/);
      if (bulletMatch) {
        processedLines.push({
          line,
          isListItem: true,
          isBulletList: true,
          isNumberedList: false,
          level,
          content: bulletMatch[2],
          index,
          bulletOrNumber: '•'
        });
        return;
      }
      
      // Check for numbered lists
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        processedLines.push({
          line,
          isListItem: true,
          isBulletList: false,
          isNumberedList: true,
          level,
          content: numberedMatch[2],
          index,
          bulletOrNumber: numberedMatch[1] + '.'
        });
        return;
      }
      
      // Regular line
      processedLines.push({
        line,
        isListItem: false,
        isBulletList: false,
        isNumberedList: false,
        level: 0,
        content: line,
        index,
        bulletOrNumber: ''
      });
    });
    
    return processedLines;
  }, []);

  return (
    <View onLayout={handleLayout}>
      {textWithCodeBlocks.map((block, blockIndex) => {
        if (block.type === 'codeBlock') {
          return (
            <View key={`code-block-${blockIndex}`} style={styles.codeBlock}>
              {block.language ? (
                <Text style={styles.codeLanguage}>{block.language}</Text>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <CodeHighlighter code={block.content} language={block.language} />
              </ScrollView>
            </View>
          );
        } else {
          // Process regular text (split into lines to handle lists)
          const lines = block.content.split('\n');
          const processedLines = processLists(lines);
          
          // Group list items together
          const renderedLines: React.ReactNode[] = [];
          let i = 0;
          
          while (i < processedLines.length) {
            const currentLine = processedLines[i];
            
            // If it's not a list item, render it as before
            if (!currentLine.isListItem) {
              const line = currentLine.line;
              const lineIndex = currentLine.index;
              
              // Check for headers (# Heading)
              const headerMatch = line.trim().match(/^(#{1,6})\s+(.+)$/);
              if (headerMatch) {
                const [, hashes, content] = headerMatch;
                const level = hashes.length;
                renderedLines.push(
                  <View key={lineIndex} style={styles.header}>
                    <Text 
                      style={[
                        styles.headerText, 
                        styles[`h${level}` as keyof typeof styles] || styles.h1,
                        style
                      ]}
                    >
                      <ParseInlineFormatting 
                        text={content} 
                        lineId={`header-${blockIndex}-${lineIndex}`} 
                        onImageLoad={handleImageLoaded}
                      />
                    </Text>
                  </View>
                );
                i++;
                continue;
              }
              
              // Check for blockquotes (> Quote)
              if (line.trim().startsWith('>')) {
                const quoteContent = line.trim().substring(1).trim();
                renderedLines.push(
                  <View key={lineIndex} style={styles.blockquote}>
                    <View style={styles.blockquoteBar} />
                    <Text style={[styles.blockquoteText, style]}>
                      <ParseInlineFormatting 
                        text={quoteContent} 
                        lineId={`blockquote-${blockIndex}-${lineIndex}`} 
                        onImageLoad={handleImageLoaded}
                      />
                    </Text>
                  </View>
                );
                i++;
                continue;
              }
              
              // Check for horizontal rule (---, ***, ___)
              const hrMatch = line.trim().match(/^([-*_])\1{2,}$/);
              if (hrMatch) {
                renderedLines.push(
                  <View key={`hr-${blockIndex}-${lineIndex}`} style={styles.horizontalRule} />
                );
                i++;
                continue;
              }
              
              // Handle normal text with inline formatting
              renderedLines.push(
                <Text key={`line-${blockIndex}-${lineIndex}`} style={style}>
                  <ParseInlineFormatting 
                    text={line} 
                    lineId={`line-${blockIndex}-${lineIndex}`}
                    onImageLoad={handleImageLoaded}
                  />
                  {lineIndex < lines.length - 1 ? '\n' : ''}
                </Text>
              );
              
              i++;
              continue;
            }
            
            // It's a list item, collect all items in this list at the same level
            const listItems: typeof processedLines = [];
            let currentLevel = currentLine.level;
            
            // Collect all items in this list (and nested lists)
            while (i < processedLines.length && 
                  (processedLines[i].isListItem && processedLines[i].level >= currentLevel)) {
              listItems.push(processedLines[i]);
              i++;
            }
            
            // Render the list recursively - keep logic but use consistent unique keys
            const renderListItems = (items: typeof processedLines, parentLevel: number, listGroupId: string): React.ReactNode => {
              const result: React.ReactNode[] = [];
              let j = 0;
              
              while (j < items.length) {
                const item = items[j];
                
                if (item.level === parentLevel) {
                  // This is a direct child of the current level
                  const nestedItems: typeof processedLines = [];
                  
                  // Collect all nested items
                  let k = j + 1;
                  while (k < items.length && items[k].level > parentLevel) {
                    nestedItems.push(items[k]);
                    k++;
                  }
                  
                  const lineIndex = item.index;
                  // Use a more unique and stable ID for list items
                  const itemId = `list-item-${blockIndex}-${lineIndex}-${parentLevel}-${j}`;
                  
                  result.push(
                    <View key={itemId} style={styles.listItemContainer}>
                      <View style={[styles.listItem, { marginLeft: item.level * 20 }]}>
                        <Text style={item.isBulletList ? styles.bullet : styles.number}>
                          {item.bulletOrNumber}
                        </Text>
                        <View style={styles.listItemContent}>
                          <Text style={[styles.listItemText, style]}>
                            <ParseInlineFormatting 
                              text={item.content} 
                              lineId={`list-content-${blockIndex}-${lineIndex}-${parentLevel}-${j}`} 
                              onImageLoad={handleImageLoaded}
                            />
                          </Text>
                          
                          {nestedItems.length > 0 && renderListItems(
                            nestedItems, 
                            parentLevel + 1, 
                            `${listGroupId}-${j}`
                          )}
                        </View>
                      </View>
                    </View>
                  );
                  
                  j = k;
                } else {
                  // Skip this item as it will be handled by a nested call
                  j++;
                }
              }
              
              return <React.Fragment key={`list-group-${listGroupId}-level-${parentLevel}`}>{result}</React.Fragment>;
            };
            
            renderedLines.push(renderListItems(listItems, currentLevel, `block-${blockIndex}-items-${i}`));
          }
          
          return <View key={`text-block-${blockIndex}`}>{renderedLines}</View>;
        }
      })}
    </View>
  );
});

// Simple code highlighter for common languages
const CodeHighlighter: React.FC<{ code: string, language: string }> = ({ code, language }) => {
  // If language is not specified or not supported, return plain code
  if (!language || !['javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'swift'].includes(language)) {
    return <Text style={styles.codeText}>{code}</Text>;
  }

  const lines = code.split('\n');
  
  return (
    <View>
      {lines.map((line, index) => {
        // Common patterns across languages
        let components: React.ReactNode[] = [];
        
        // Comments
        const commentRegex = language === 'python' 
          ? /(#.*)$/ 
          : /(\/\/.*|\/\*.*\*\/)$/;
        
        const stringRegex = /(['"`])(.*?)\1/g;
        const keywordRegexMap: Record<string, RegExp> = {
          'javascript': /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|of|in|true|false|null|undefined|this|new|try|catch|throw|async|await)\b/g,
          'typescript': /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|of|in|true|false|null|undefined|this|new|try|catch|throw|async|await|interface|type|enum)\b/g,
          'python': /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|in|is|not|and|or|True|False|None)\b/g,
          'java': /\b(public|private|protected|class|interface|enum|extends|implements|return|if|else|for|while|new|try|catch|throw|throws|static|final|void|int|boolean|String)\b/g,
          'csharp': /\b(public|private|protected|class|interface|enum|struct|return|if|else|for|foreach|while|new|try|catch|throw|using|static|readonly|void|int|bool|string)\b/g,
          'cpp': /\b(class|struct|return|if|else|for|while|new|try|catch|throw|using|namespace|template|typename|const|auto|static|void|int|bool|char|float|double)\b/g,
          'go': /\b(func|package|import|return|if|else|for|range|switch|case|defer|go|chan|var|const|struct|interface|map|type)\b/g,
          'rust': /\b(fn|let|mut|const|use|mod|struct|enum|trait|impl|pub|return|if|else|for|while|loop|match|self|Self|crate|super)\b/g,
          'swift': /\b(func|var|let|return|if|else|for|while|guard|switch|case|class|struct|enum|protocol|extension|import|self|Self)\b/g,
        };
        
        const keywordRegex = keywordRegexMap[language];
        
        // First split by comments
        const commentMatch = line.match(commentRegex);
        if (commentMatch && commentMatch.index !== undefined) {
          const codeBeforeComment = line.substring(0, commentMatch.index);
          const comment = commentMatch[0];
          
          // Process code before comment
          let lastIndex = 0;
          let match;
          let stringCounter = 0;
          
          // Process strings
          const processedStringRegex = new RegExp(stringRegex);
          while ((match = processedStringRegex.exec(codeBeforeComment)) !== null) {
            if (match.index > lastIndex) {
              const textSegment = codeBeforeComment.substring(lastIndex, match.index);
              // Process keywords in text segment
              components.push(processKeywords(textSegment, keywordRegex, `code-${index}-kw-${lastIndex}`));
            }
            components.push(
              <Text key={`string-${index}-${stringCounter}`} style={styles.codeString}>
                {match[0]}
              </Text>
            );
            lastIndex = match.index + match[0].length;
            stringCounter++;
          }
          
          if (lastIndex < codeBeforeComment.length) {
            const textSegment = codeBeforeComment.substring(lastIndex);
            components.push(processKeywords(textSegment, keywordRegex, `code-${index}-kw-${lastIndex}`));
          }
          
          components.push(<Text key={`comment-${index}`} style={styles.codeComment}>{comment}</Text>);
        } else {
          // No comments, just process strings and keywords
          let lastIndex = 0;
          let match;
          let stringCounter = 0;
          
          const processedStringRegex = new RegExp(stringRegex);
          while ((match = processedStringRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
              const textSegment = line.substring(lastIndex, match.index);
              components.push(processKeywords(textSegment, keywordRegex, `code-${index}-kw-${lastIndex}`));
            }
            components.push(
              <Text key={`string-${index}-${stringCounter}`} style={styles.codeString}>
                {match[0]}
              </Text>
            );
            lastIndex = match.index + match[0].length;
            stringCounter++;
          }
          
          if (lastIndex < line.length) {
            const textSegment = line.substring(lastIndex);
            components.push(processKeywords(textSegment, keywordRegex, `code-${index}-kw-${lastIndex}`));
          }
        }
        
        return (
          <Text key={`code-line-${index}`} style={styles.codeText}>
            {components.length > 0 ? components : line}
            {index < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </View>
  );
};

// Helper to process keywords in code
const processKeywords = (text: string, keywordRegex: RegExp, prefix: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  
  if (!keywordRegex) {
    return [<React.Fragment key={`${prefix}-text`}>{text}</React.Fragment>];
  }
  
  let lastIndex = 0;
  let match;
  let counter = 0;
  const regex = new RegExp(keywordRegex);
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<React.Fragment key={`${prefix}-text-${counter}`}>{text.substring(lastIndex, match.index)}</React.Fragment>);
    }
    parts.push(
      <Text key={`${prefix}-keyword-${counter}`} style={styles.codeKeyword}>
        {match[0]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
    counter++;
  }
  
  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`${prefix}-text-end`}>{text.substring(lastIndex)}</React.Fragment>);
  }
  
  return parts;
};

const ParseInlineFormatting: React.FC<{ 
  text: string, 
  lineId: string,
  onImageLoad?: () => void 
}> = ({ text, lineId, onImageLoad }) => {
  const [result, _] = React.useMemo(() => {
    const { result } = processFormattingWithCounter(text, 0, onImageLoad);
    return [result.length > 0 ? result : text, null];
  }, [text, lineId, onImageLoad]);
  
  return <>{result}</>;
};

const processFormattingWithCounter = (
  text: string,
  counter: number,
  onImageLoad?: () => void
): { result: React.ReactNode[]; counter: number } => {
  if (!text) {
    return { result: [], counter };
  }

  // Handle images ![alt](url) or ![alt](url "caption")
  const imageMatch = text.match(/!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/);
  if (imageMatch) {
    const [fullMatch, altText, imageUrl, caption] = imageMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    // Create image component with onLoad handler
    const imageComponent = (
      <View key={`image-${counter}`} style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          accessibilityLabel={altText}
          onLoad={() => {
            if (onImageLoad) {
              console.log('Image loaded:', imageUrl);
              onImageLoad();
            }
          }}
          onError={(error) => {
            console.error('Image failed to load:', imageUrl, error.nativeEvent.error);
          }}
        />
        {caption && <Text style={styles.imageCaption}>{caption}</Text>}
      </View>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        imageComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // Process bold (**text**)
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  if (boldMatch) {
    const [fullMatch, boldText] = boldMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    // Process inner formatting first (allow nested formatting)
    const innerResult = processFormattingWithCounter(boldText, counter, onImageLoad);
    counter = innerResult.counter;

    // Apply bold style to the processed inner content
    const boldComponent = (
      <Text key={`bold-${counter}`} style={{ fontWeight: 'bold' }}>
        {innerResult.result.length > 0 ? innerResult.result : boldText}
      </Text>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        boldComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // Process italic (*text*)
  const italicMatch = text.match(/\*(.+?)\*/);
  if (italicMatch) {
    const [fullMatch, italicText] = italicMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    // Process inner formatting first (allow nested formatting)
    const innerResult = processFormattingWithCounter(italicText, counter, onImageLoad);
    counter = innerResult.counter;

    // Apply italic style to the processed inner content
    const italicComponent = (
      <Text key={`italic-${counter}`} style={{ fontStyle: 'italic' }}>
        {innerResult.result.length > 0 ? innerResult.result : italicText}
      </Text>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        italicComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // Process strikethrough (~~text~~)
  const strikethroughMatch = text.match(/~~(.+?)~~/);
  if (strikethroughMatch) {
    const [fullMatch, strikethroughText] = strikethroughMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    // Process inner formatting first (allow nested formatting)
    const innerResult = processFormattingWithCounter(strikethroughText, counter, onImageLoad);
    counter = innerResult.counter;

    // Apply strikethrough style to the processed inner content
    const strikethroughComponent = (
      <Text key={`strike-${counter}`} style={styles.strikethrough}>
        {innerResult.result.length > 0 ? innerResult.result : strikethroughText}
      </Text>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        strikethroughComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // Process inline code (`code`)
  const codeMatch = text.match(/`([^`]+)`/);
  if (codeMatch) {
    const [fullMatch, codeText] = codeMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    const codeComponent = (
      <Text key={`code-${counter}`} style={styles.inlineCode}>
        {codeText}
      </Text>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        codeComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // Process links [text](url)
  const linkMatch = text.match(/\[(.+?)\]\((.+?)\)/);
  if (linkMatch) {
    const [fullMatch, linkText, linkUrl] = linkMatch;
    const parts = text.split(fullMatch);
    const prefix = parts[0];
    const suffix = parts.slice(1).join(fullMatch);

    const prefixResult = processFormattingWithCounter(prefix, counter, onImageLoad);
    counter = prefixResult.counter;

    const handlePress = () => {
      Linking.openURL(linkUrl).catch((err) => console.error('Error opening URL:', err));
    };

    const linkComponent = (
      <Text
        key={`link-${counter}`}
        style={styles.link}
        onPress={handlePress}
      >
        {linkText}
      </Text>
    );
    
    counter++;

    const suffixResult = processFormattingWithCounter(suffix, counter, onImageLoad);
    counter = suffixResult.counter;

    return {
      result: [
        ...prefixResult.result,
        linkComponent,
        ...suffixResult.result,
      ],
      counter,
    };
  }

  // If no formatting is found, return text as is
  return { result: [<Text key={`plain-${counter}`}>{text}</Text>], counter: counter + 1 };
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  bulletItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 5,
  },
  bullet: {
    marginRight: 5,
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
  },
  numberedItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 5,
  },
  number: {
    marginRight: 5,
    fontSize: 16,
  },
  numberedText: {
    flex: 1,
  },
  codeBlock: {
    backgroundColor: COLORS.lightGray,
    padding: 8,
    borderRadius: 5,
    marginVertical: 8,
  },
  inlineCodeBlock: {
    backgroundColor: COLORS.lightGray,
    padding: 8,
    borderRadius: 5,
    marginVertical: 5,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  codeLanguage: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  codeKeyword: {
    color: '#0000CC', // Blue for keywords
    fontFamily: 'monospace',
    fontSize: 14,
  },
  codeString: {
    color: '#008800', // Green for strings
    fontFamily: 'monospace',
    fontSize: 14,
  },
  codeComment: {
    color: '#888888', // Gray for comments
    fontFamily: 'monospace',
    fontSize: 14,
    fontStyle: 'italic',
  },
  
  // New styles for headers
  header: {
    marginTop: 8,
    marginBottom: 4,
  },
  headerText: {
    fontWeight: 'bold',
  },
  h1: {
    fontSize: 24,
    marginTop: 12,
    marginBottom: 8,
  },
  h2: {
    fontSize: 22,
    marginTop: 10,
    marginBottom: 6,
  },
  h3: {
    fontSize: 20,
    marginTop: 8,
    marginBottom: 5,
  },
  h4: {
    fontSize: 18,
    marginTop: 6,
    marginBottom: 4,
  },
  h5: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 3,
  },
  h6: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 2,
  },
  
  // Blockquote styles
  blockquote: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingVertical: 4,
  },
  blockquoteBar: {
    width: 4,
    backgroundColor: COLORS.gray,
    borderRadius: 2,
    marginRight: 8,
  },
  blockquoteText: {
    fontStyle: 'italic',
    flex: 1,
    color: COLORS.gray,
  },
  
  // Horizontal rule style
  horizontalRule: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
    width: '100%',
  },
  
  // Table styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray,
  },
  tableCell: {
    padding: 8,
    borderRightWidth: 1,
    borderColor: COLORS.lightGray,
    minWidth: 100,
  },
  tableHeaderCell: {
    backgroundColor: COLORS.lightGray,
  },
  tableCellText: {
    fontSize: 14,
  },
  tableHeaderText: {
    fontWeight: 'bold',
  },
  
  // Image styles
  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  imageCaption: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Improved list styles
  listItemContainer: {
    marginVertical: 2,
  },
  listItem: {
    flexDirection: 'row',
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    flex: 1,
  },
});

export default FormattedText; 