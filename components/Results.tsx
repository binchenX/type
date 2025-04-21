import styled from 'styled-components';
import { ParsedMarkdownItem } from '@/types';

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

interface ResultsProps {
    parsedItems: ParsedMarkdownItem[];
    onReset: () => void;
}

const Results: React.FC<ResultsProps> = ({ parsedItems, onReset }) => {
    // Calculate total character count
    const totalChars = parsedItems.reduce((sum, item) => sum + item.content.length, 0);

    // Calculate total word count (roughly 5 chars = 1 word)
    const totalWords = Math.round(totalChars / 5);

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

            <div>
                <Button onClick={onReset}>Practice Again</Button>
            </div>
        </Container>
    );
};

export default Results; 
