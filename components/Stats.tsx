import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TypingState, TypingStats } from '@/types';

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  background-color: var(--background-light);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-light);
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const ProgressBar = styled.div`
  height: 8px;
  width: 100%;
  background-color: var(--background-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div<{ width: number }>`
  height: 100%;
  width: ${props => `${props.width}%`};
  background-color: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

interface StatsProps {
    currentIndex: number;
    totalItems: number;
    typingState: TypingState;
    currentText: string;
}

const Stats: React.FC<StatsProps> = ({
    currentIndex,
    totalItems,
    typingState,
    currentText
}) => {
    const [stats, setStats] = useState<TypingStats>({
        wpm: 0,
        accuracy: 100,
        time: 0
    });

    // Calculate and update stats
    useEffect(() => {
        const calculateStats = () => {
            if (!typingState.startTime) return;

            // Calculate time in seconds
            const currentTime = typingState.endTime || Date.now();
            const elapsedTimeMs = currentTime - typingState.startTime;
            const elapsedTimeSec = elapsedTimeMs / 1000;

            // Calculate WPM (Words Per Minute)
            // Standard: 5 characters = 1 word
            const charCount = typingState.currentPosition;
            const wordCount = charCount / 5;
            const minutes = elapsedTimeSec / 60;
            const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

            // Calculate accuracy
            const errorRate = typingState.errors / (charCount || 1);
            const accuracy = Math.max(0, Math.round((1 - errorRate) * 100));

            setStats({
                wpm,
                accuracy,
                time: Math.round(elapsedTimeSec)
            });
        };

        // Calculate stats every 500ms
        const intervalId = setInterval(calculateStats, 500);

        return () => clearInterval(intervalId);
    }, [typingState]);

    // Calculate progress percentage
    const progressPercentage = totalItems > 0
        ? Math.round((currentIndex / totalItems) * 100)
        : 0;

    // Calculate current character position percentage
    const textProgressPercentage = currentText.length > 0
        ? Math.round((typingState.currentPosition / currentText.length) * 100)
        : 0;

    return (
        <div>
            <ProgressInfo>
                <div>Progress: {currentIndex + 1} / {totalItems}</div>
                <div>{progressPercentage}%</div>
            </ProgressInfo>
            <ProgressBar>
                <ProgressFill width={progressPercentage} />
            </ProgressBar>

            <StatsContainer>
                <StatItem>
                    <StatValue>{stats.wpm}</StatValue>
                    <StatLabel>WPM</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue>{stats.accuracy}%</StatValue>
                    <StatLabel>Accuracy</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue>{stats.time}s</StatValue>
                    <StatLabel>Time</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue>{textProgressPercentage}%</StatValue>
                    <StatLabel>Completed</StatLabel>
                </StatItem>
            </StatsContainer>
        </div>
    );
};

export default Stats; 
