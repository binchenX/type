import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ParsedMarkdownItem, TypingState, ErrorFrequencyMap } from '@/types';
import UploadArea from '@/components/UploadArea';
import TypingArea from '@/components/TypingArea';
import Results from '@/components/Results';
import Stats from '@/components/Stats';
import ThemeToggle from '@/components/ThemeToggle';

const Container = styled.div`
  min-height: 100vh;
  padding: 2rem 0;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text);
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export default function Home() {
    const [uploadedContent, setUploadedContent] = useState<string | null>(null);
    const [parsedItems, setParsedItems] = useState<ParsedMarkdownItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [typingState, setTypingState] = useState<TypingState>({
        startTime: null,
        endTime: null,
        currentPosition: 0,
        errors: 0,
        typedChars: [],
    });
    const [isCompleted, setIsCompleted] = useState(false);
    const [errorFrequencyMap, setErrorFrequencyMap] = useState<ErrorFrequencyMap>({});

    // Process markdown content when uploaded
    useEffect(() => {
        if (!uploadedContent) return;

        // Simple parser to extract text items from markdown
        const parseMarkdown = (content: string): ParsedMarkdownItem[] => {
            // Split by newlines and filter out empty lines
            const lines = content.split('\n').filter(line => line.trim() !== '');

            // Extract list items and other text
            const items: ParsedMarkdownItem[] = [];

            lines.forEach((line) => {
                // Check if it's a list item (starts with - or *)
                const listItemMatch = line.match(/^[-*]\s+(.+)$/);
                if (listItemMatch) {
                    items.push({
                        type: 'list-item',
                        content: listItemMatch[1].trim()
                    });
                }
                // Check if it's a heading (starts with #)
                else if (line.startsWith('#')) {
                    const level = line.match(/^(#+)\s+/)?.[1].length || 1;
                    const content = line.replace(/^#+\s+/, '').trim();
                    items.push({
                        type: 'heading',
                        level,
                        content
                    });
                }
                // Regular paragraph text
                else {
                    items.push({
                        type: 'paragraph',
                        content: line.trim()
                    });
                }
            });

            return items;
        };

        const parsed = parseMarkdown(uploadedContent);
        setParsedItems(parsed);

        // Reset typing state with the first item
        if (parsed.length > 0) {
            setCurrentItemIndex(0);
            setTypingState({
                startTime: null,
                endTime: null,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
            });
            setIsCompleted(false);
        }
    }, [uploadedContent]);

    const handleFileUpload = (content: string) => {
        setUploadedContent(content);
        // Reset error frequency map when new content is uploaded
        setErrorFrequencyMap({});
    };

    const resetPractice = () => {
        setCurrentItemIndex(0);
        setTypingState({
            startTime: null,
            endTime: null,
            currentPosition: 0,
            errors: 0,
            typedChars: [],
        });
        setIsCompleted(false);
        // Don't reset error frequency map to maintain history across sessions
    };

    const moveToNextItem = () => {
        if (currentItemIndex < parsedItems.length - 1) {
            setCurrentItemIndex(prev => prev + 1);
            setTypingState({
                startTime: null,
                endTime: null,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
            });
        } else {
            setIsCompleted(true);
        }
    };

    const getCurrentContent = (): string => {
        if (!parsedItems.length || currentItemIndex >= parsedItems.length) return '';
        return parsedItems[currentItemIndex].content;
    };

    // Function to update error frequency map
    const updateErrorFrequencyMap = (expectedChar: string, typedChar: string) => {
        setErrorFrequencyMap(prevMap => {
            const newMap = { ...prevMap };

            // Initialize character data if it doesn't exist
            if (!newMap[expectedChar]) {
                newMap[expectedChar] = { attempts: 0, errors: 0 };
            }

            // Increment attempts
            newMap[expectedChar].attempts += 1;

            // Increment errors if character was typed incorrectly
            if (expectedChar !== typedChar) {
                newMap[expectedChar].errors += 1;
            }

            return newMap;
        });
    };

    return (
        <>
            <Head>
                <title>Typing Practice</title>
                <meta name="description" content="Improve your typing skills by practicing with your own texts" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Container className="container">
                <Header>
                    <Title>Typing Practice</Title>
                    <ThemeToggle />
                </Header>

                <Main>
                    {!uploadedContent ? (
                        <UploadArea onUpload={handleFileUpload} />
                    ) : (
                        <>
                            {isCompleted ? (
                                <>
                                    <Results
                                        parsedItems={parsedItems}
                                        onReset={resetPractice}
                                        errorFrequencyMap={errorFrequencyMap}
                                    />
                                </>
                            ) : (
                                <>
                                    <Stats
                                        currentIndex={currentItemIndex}
                                        totalItems={parsedItems.length}
                                        typingState={typingState}
                                        currentText={getCurrentContent()}
                                    />

                                    <TypingArea
                                        text={getCurrentContent()}
                                        typingState={typingState}
                                        setTypingState={setTypingState}
                                        onComplete={moveToNextItem}
                                        updateErrorFrequencyMap={updateErrorFrequencyMap}
                                    />
                                </>
                            )}
                        </>
                    )}
                </Main>
            </Container>
        </>
    );
} 
