import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { ParsedMarkdownItem, ErrorFrequencyMap } from '@/types';
import { generatePracticeText, convertPracticeSectionsToItems, isLocalEnvironment } from '@/services/practiceService';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  background-color: var(--background-light);
  border-radius: 8px;
  text-align: center;
`;

const Title = styled.h2`
  color: var(--primary);
  margin-bottom: 1rem;
`;

const Message = styled.p`
  font-size: 1.25rem;
  color: var(--text);
  margin-bottom: 1.5rem;
`;

const Button = styled.button`
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--primary-dark);
  }
`;

const OutlineButton = styled(Button)`
  background-color: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  margin-left: 1rem;
  
  &:hover {
    background-color: var(--primary);
    color: white;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary);
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: var(--text-light);
`;

const ErrorStatsSection = styled.div`
  width: 100%;
  max-width: 600px;
  margin-top: 2rem;
  text-align: left;
`;

const ErrorStatsHeader = styled.h3`
  color: var(--text);
  margin-bottom: 1rem;
  text-align: center;
`;

const ErrorList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ErrorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 4px;
  background-color: var(--background);
  border: 1px solid var(--border);
  position: relative;
  cursor: pointer;
  
  &:hover .incorrect-replacements {
    display: block;
  }
`;

const CharDisplay = styled.span<{ errorRate: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  background-color: ${props => {
    if (props.errorRate >= 0.5) return 'var(--error)';
    if (props.errorRate >= 0.25) return 'orange';
    return 'var(--success)';
  }};
  color: white;
  font-family: var(--font-mono);
  font-weight: 600;
`;

const ErrorStats = styled.div`
  display: flex;
  flex-direction: column;
`;

const ErrorRate = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
`;

const ErrorCount = styled.span`
  font-size: 0.75rem;
  color: var(--text-light);
`;

const IncorrectReplacements = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  width: 200px;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.75rem;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
  font-size: 0.875rem;
  
  &:before {
    content: '';
    position: absolute;
    top: -6px;
    left: 15px;
    width: 12px;
    height: 12px;
    background-color: var(--background);
    border-left: 1px solid var(--border);
    border-top: 1px solid var(--border);
    transform: rotate(45deg);
  }
`;

const ReplacementItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const ReplacementChar = styled.span`
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--error);
`;

const ReplacementCount = styled.span`
  color: var(--text-light);
`;

const TooltipLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-light);
  margin-bottom: 0.5rem;
  display: block;
`;

const LoadingSpinner = styled.div`
  border: 3px solid var(--background);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 0.5rem;
  vertical-align: middle;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const PracticeGenerationSection = styled.div`
  width: 100%;
  max-width: 700px;
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--background);
  text-align: left;
`;

const PracticeItemList = styled.ul`
  list-style: decimal inside;
  padding: 0;
  margin: 1rem 0;
`;

const PracticeItem = styled.li`
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  background-color: var(--background-light);
  font-family: var(--font-mono);
`;

const DetailedErrorsSection = styled.div`
  width: 100%;
  max-width: 600px;
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--background);
`;

const DetailedErrorsTitle = styled.h4`
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.875rem;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.875rem;
`;

const TableHead = styled.thead`
  background-color: var(--background-light);
  
  th {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
`;

const TableBody = styled.tbody`
  tr:nth-child(even) {
    background-color: var(--background-light);
  }
  
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
  }
`;

const CharCell = styled.td`
  font-family: var(--font-mono);
  font-weight: 600;
`;

const EnvironmentBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 4px;
  margin-left: 0.5rem;
  color: white;
  background-color: ${props => props.theme === 'local' ? 'var(--success)' : 'var(--text-light)'};
`;

const WordErrorsSection = styled.div`
  width: 100%;
  max-width: 600px;
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--background);
`;

const WordErrorItem = styled.div`
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
  background-color: var(--background-light);
  border-left: 4px solid var(--error);
`;

const OriginalWord = styled.span`
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text);
`;

const TypedWord = styled.span`
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--error);
  text-decoration: line-through;
`;

interface ResultsProps {
  parsedItems: ParsedMarkdownItem[];
  onReset: () => void;
  errorFrequencyMap: ErrorFrequencyMap;
  onStartNewPractice?: (items: ParsedMarkdownItem[]) => void;
  typingErrors?: Array<{
    index: number;
    expected: string;
    actual: string;
  }>;
  typingWordErrors?: Array<{
    word: string;
    typedWord: string;
    startIndex: number;
    endIndex: number;
  }>;
}

const Results: React.FC<ResultsProps> = ({
  parsedItems,
  onReset,
  errorFrequencyMap,
  onStartNewPractice,
  typingErrors = [],
  typingWordErrors = []
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPractice, setGeneratedPractice] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showDetailedErrors, setShowDetailedErrors] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showWordErrors, setShowWordErrors] = useState(typingWordErrors.length > 0);

  // Deduplicate word errors
  const uniqueWordErrors = useMemo(() => {
    const seen = new Map();
    return typingWordErrors.filter(error => {
      const key = `${error.word}:${error.typedWord}`;
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, true);
      return true;
    });
  }, [typingWordErrors]);

  useEffect(() => {
    setIsLocal(isLocalEnvironment());
  }, []);

  useEffect(() => {
    if (typingWordErrors.length > 0 && !showWordErrors) {
      setShowWordErrors(true);
    }
  }, [typingWordErrors]);

  const totalChars = parsedItems.reduce((sum, item) => sum + item.content.length, 0);
  const totalWords = Math.round(totalChars / 5);

  const errorItems = Object.entries(errorFrequencyMap)
    .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
    .map(([char, stats]) => ({
      char,
      attempts: stats.attempts,
      errors: stats.errors,
      errorRate: stats.errors / stats.attempts,
      incorrectReplacements: stats.incorrectReplacements || {}
    }))
    .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors)
    .slice(0, 15);

  const handleGeneratePractice = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorFrequencyMap),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate practice text');
      }

      console.log('Generated practice text using provider:', data.provider);

      // Check if practiceSections exists in the response
      if (!data.practiceSections || !Array.isArray(data.practiceSections)) {
        throw new Error('Invalid response format: missing practice sections');
      }

      // Set the generated practice sections
      setGeneratedPractice(data.practiceSections);

      // Set the prompt if available
      if (data.prompt) {
        setPrompt(data.prompt);
      }
    } catch (err) {
      console.error('Error generating practice text:', err);
      setGenerationError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
      console.log('Practice text generation process completed');
    }
  };

  const handleStartPractice = () => {
    if (onStartNewPractice && generatedPractice.length > 0) {
      const practiceItems = convertPracticeSectionsToItems(generatedPractice);
      onStartNewPractice(practiceItems);
    }
  };

  return (
    <Container>
      <div>
        <Title>Practice Complete!</Title>
        <Message>Congratulations! You've completed the typing practice.</Message>
      </div>

      <StatsContainer>
        <StatItem>
          <StatValue>{parsedItems.length}</StatValue>
          <StatLabel>Text Sections</StatLabel>
        </StatItem>

        <StatItem>
          <StatValue>{totalWords}</StatValue>
          <StatLabel>Words</StatLabel>
        </StatItem>

        <StatItem>
          <StatValue>{totalChars}</StatValue>
          <StatLabel>Characters</StatLabel>
        </StatItem>
      </StatsContainer>

      {errorItems.length > 0 && (
        <ErrorStatsSection>
          <ErrorStatsHeader>
            Characters You Need to Practice
            {isLocal ? (
              <EnvironmentBadge theme="local">LLM-Enabled</EnvironmentBadge>
            ) : (
              <EnvironmentBadge theme="remote">LLM Disabled</EnvironmentBadge>
            )}
          </ErrorStatsHeader>
          <p>Here are the characters you had the most trouble with, sorted by error rate:</p>

          <ErrorList>
            {errorItems.map(item => (
              <ErrorItem key={item.char}>
                <CharDisplay errorRate={item.errorRate}>
                  {item.char === ' ' ? '⎵' : item.char}
                </CharDisplay>
                <ErrorStats>
                  <ErrorRate>{Math.round(item.errorRate * 100)}% error rate</ErrorRate>
                  <ErrorCount>{item.errors} of {item.attempts} attempts</ErrorCount>
                </ErrorStats>

                {Object.keys(item.incorrectReplacements).length > 0 && (
                  <IncorrectReplacements className="incorrect-replacements">
                    <TooltipLabel>You typed instead:</TooltipLabel>
                    {Object.entries(item.incorrectReplacements)
                      .sort(([_, countA], [__, countB]) => countB - countA)
                      .map(([replacementChar, count]) => (
                        <ReplacementItem key={replacementChar}>
                          <ReplacementChar>
                            {replacementChar === ' ' ? '⎵' : replacementChar}
                          </ReplacementChar>
                          <ReplacementCount>× {count}</ReplacementCount>
                        </ReplacementItem>
                      ))}
                  </IncorrectReplacements>
                )}
              </ErrorItem>
            ))}
          </ErrorList>

          {isLocal && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Button
                onClick={handleGeneratePractice}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner /> Generating Practice Text...
                  </>
                ) : (
                  "Generate AI-Powered Practice Text"
                )}
              </Button>
            </div>
          )}

          {!isLocal && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', margin: '2rem 0 0', textAlign: 'center' }}>
              The AI-powered practice generation is only available when running locally.
              <br />
              Please run the app locally to access this feature.
            </p>
          )}
        </ErrorStatsSection>
      )}

      {generatedPractice.length > 0 && (
        <PracticeGenerationSection>
          <h3>Generated Practice Text</h3>
          <p>
            Here are {!isLocal ? "basic" : "custom AI-generated"} practice sentences
            focused on your problematic characters: {errorItems.map(item => item.char === ' ' ? 'SPACE' : item.char).join(', ')}
          </p>

          <PracticeItemList>
            {generatedPractice.map((text, index) => (
              <PracticeItem key={index}>{text}</PracticeItem>
            ))}
          </PracticeItemList>

          {prompt && (
            <div style={{ marginTop: '2rem', width: '100%', maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>AI Debug Info</h3>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-light)'
                  }}
                >
                  {showDebug ? 'Hide Prompt' : 'Show Prompt'}
                </button>
              </div>

              {showDebug && (
                <div style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  overflowX: 'auto'
                }}>
                  {prompt}
                </div>
              )}
            </div>
          )}

          {onStartNewPractice && (
            <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Button onClick={handleStartPractice}>
                Start Practicing These Sentences
              </Button>
              <OutlineButton onClick={handleGeneratePractice}>
                Generate New Sentences
              </OutlineButton>
            </div>
          )}
        </PracticeGenerationSection>
      )}

      {generationError && (
        <div style={{ color: 'var(--error)', marginTop: '1rem' }}>
          Error: {generationError}
        </div>
      )}

      {typingErrors && typingErrors.length > 0 && (
        <DetailedErrorsSection>
          <DetailedErrorsTitle>
            Detailed Typing Errors
            <ToggleButton onClick={() => setShowDetailedErrors(!showDetailedErrors)}>
              {showDetailedErrors ? 'Hide' : 'Show'} Details
            </ToggleButton>
          </DetailedErrorsTitle>

          {showDetailedErrors && (
            <ErrorsTable>
              <TableHead>
                <tr>
                  <th>Expected</th>
                  <th>You Typed</th>
                </tr>
              </TableHead>
              <TableBody>
                {typingErrors.map((error, index) => (
                  <tr key={index}>
                    <CharCell>
                      {error.expected === ' ' ? '⎵' : error.expected}
                    </CharCell>
                    <CharCell>
                      {error.actual === ' ' ? '⎵' : error.actual}
                    </CharCell>
                  </tr>
                ))}
              </TableBody>
            </ErrorsTable>
          )}
        </DetailedErrorsSection>
      )}

      {typingWordErrors && typingWordErrors.length > 0 && (
        <WordErrorsSection>
          <DetailedErrorsTitle style={{ color: 'var(--error)' }}>
            Mistyped Words ({uniqueWordErrors.length})
            <ToggleButton onClick={() => setShowWordErrors(!showWordErrors)}>
              {showWordErrors ? 'Hide' : 'Show'} Details
            </ToggleButton>
          </DetailedErrorsTitle>

          {showWordErrors && (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                These are the words you had trouble typing correctly:
              </p>
              {uniqueWordErrors.map((error, index) => (
                <WordErrorItem key={index}>
                  <div>
                    Expected: <OriginalWord>{error.word}</OriginalWord>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    You typed: <TypedWord>{error.typedWord}</TypedWord>
                  </div>
                </WordErrorItem>
              ))}
            </div>
          )}
        </WordErrorsSection>
      )}

      <ButtonGroup>
        <Button onClick={onReset}>Practice Again</Button>
        {generatedPractice.length === 0 && errorItems.length > 0 && !isGenerating && isLocal && (
          <OutlineButton onClick={handleGeneratePractice}>
            Generate Practice Text
          </OutlineButton>
        )}
      </ButtonGroup>
    </Container>
  );
};

export default Results; 
