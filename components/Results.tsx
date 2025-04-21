import styled from 'styled-components';
import { ParsedMarkdownItem, ErrorFrequencyMap } from '@/types';

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

interface ResultsProps {
    parsedItems: ParsedMarkdownItem[];
    onReset: () => void;
    errorFrequencyMap: ErrorFrequencyMap;
}

const Results: React.FC<ResultsProps> = ({ parsedItems, onReset, errorFrequencyMap }) => {
    // Calculate total character count
    const totalChars = parsedItems.reduce((sum, item) => sum + item.content.length, 0);

    // Calculate total word count (roughly 5 chars = 1 word)
    const totalWords = Math.round(totalChars / 5);

    // Prepare error frequency data for display
    const errorItems = Object.entries(errorFrequencyMap)
        .filter(([_, stats]) => stats.attempts > 0) // Only show characters that were attempted
        .map(([char, stats]) => ({
            char,
            attempts: stats.attempts,
            errors: stats.errors,
            errorRate: stats.errors / stats.attempts
        }))
        .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors) // Sort by error rate then by error count
        .slice(0, 15); // Limit to top 15 problematic characters

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
                    <ErrorStatsHeader>Characters You Need to Practice</ErrorStatsHeader>
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
                            </ErrorItem>
                        ))}
                    </ErrorList>
                </ErrorStatsSection>
            )}

            <div>
                <Button onClick={onReset}>Practice Again</Button>
            </div>
        </Container>
    );
};

export default Results; 
