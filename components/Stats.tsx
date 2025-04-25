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

const StatValue = styled.div<{ highlight?: boolean }>`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.highlight ? 'var(--error)' : 'var(--primary)'};
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

const ProgressFill = styled.div<{ width: number; error?: boolean }>`
  height: 100%;
  width: ${props => `${props.width}%`};
  background-color: ${props => props.error ? 'var(--error)' : 'var(--primary)'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    text-decoration: underline;
  }
`;

const DetailedStatsContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--background-light);
  border-radius: 8px;
  font-size: 0.875rem;
`;

const DetailedStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
`;

const DetailedStatItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background-color: var(--background);
  border-radius: 4px;
  border: 1px solid var(--border);
`;

const DetailedStatValue = styled.div<{ highlight?: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.highlight ? 'var(--error)' : 'var(--text)'};
`;

const DetailedStatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-light);
  margin-top: 0.25rem;
`;

interface StatsProps {
    currentIndex: number;
    totalItems: number;
    typingState: TypingState;
    currentText: string;
}

interface DetailedStats extends TypingStats {
    errorCount: number;
    errorRate: number;
    currentStreak: number;
    keystrokesPerMinute: number;
    charsPerSecond: number;
    longestStreak: number;
    remainingTime: number;
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
    const [detailedStats, setDetailedStats] = useState<DetailedStats>({
        wpm: 0,
        accuracy: 100,
        time: 0,
        errorCount: 0,
        errorRate: 0,
        currentStreak: 0,
        keystrokesPerMinute: 0,
        charsPerSecond: 0,
        longestStreak: 0,
        remainingTime: 0
    });
    const [showDetails, setShowDetails] = useState(false);

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
            const totalErrors = typingState.errors;
            const errorRate = totalErrors / (charCount || 1);
            const accuracy = Math.max(0, Math.round((1 - errorRate) * 100));

            // Set basic stats
            setStats({
                wpm,
                accuracy,
                time: Math.round(elapsedTimeSec)
            });

            // Calculate detailed stats

            // Calculate current streak (consecutive correct characters)
            let currentStreak = 0;
            for (let i = typingState.currentPosition - 1; i >= 0; i--) {
                if (typingState.typedChars[i] === currentText[i]) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Calculate longest streak
            let longestStreak = 0;
            let currentCorrectStreak = 0;
            for (let i = 0; i < typingState.currentPosition; i++) {
                if (typingState.typedChars[i] === currentText[i]) {
                    currentCorrectStreak++;
                    if (currentCorrectStreak > longestStreak) {
                        longestStreak = currentCorrectStreak;
                    }
                } else {
                    currentCorrectStreak = 0;
                }
            }

            // Keystrokes per minute (raw speed)
            const keystrokesPerMinute = minutes > 0 ? Math.round(charCount / minutes) : 0;

            // Characters per second
            const charsPerSecond = elapsedTimeSec > 0 ? (charCount / elapsedTimeSec).toFixed(1) : '0.0';

            // Estimated remaining time
            const remainingChars = currentText.length - charCount;
            const charsPerMilli = charCount / elapsedTimeMs;
            const estimatedRemainingMs = remainingChars / (charsPerMilli || 0.001);
            const remainingTime = Math.round(estimatedRemainingMs / 1000);

            setDetailedStats({
                wpm,
                accuracy,
                time: Math.round(elapsedTimeSec),
                errorCount: totalErrors,
                errorRate: Math.round(errorRate * 100),
                currentStreak,
                keystrokesPerMinute,
                charsPerSecond: parseFloat(charsPerSecond),
                longestStreak,
                remainingTime: remainingTime < 0 ? 0 : remainingTime
            });
        };

        // Calculate stats every 500ms
        const intervalId = setInterval(calculateStats, 500);

        return () => clearInterval(intervalId);
    }, [typingState, currentText]);

    // Calculate progress percentage
    const progressPercentage = totalItems > 0
        ? Math.round((currentIndex / totalItems) * 100)
        : 0;

    // Calculate current character position percentage
    const textProgressPercentage = currentText.length > 0
        ? Math.round((typingState.currentPosition / currentText.length) * 100)
        : 0;

    // Toggle detailed stats view
    const toggleDetails = () => {
        setShowDetails(prev => !prev);
    };

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
                    <StatValue highlight={stats.accuracy < 90}>{stats.accuracy}%</StatValue>
                    <StatLabel>Accuracy</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue>{stats.time}s</StatValue>
                    <StatLabel>Time</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue highlight={typingState.errors > 0}>{typingState.errors}</StatValue>
                    <StatLabel>Errors</StatLabel>
                </StatItem>

                <StatItem>
                    <StatValue>{textProgressPercentage}%</StatValue>
                    <StatLabel>Completed</StatLabel>
                </StatItem>
            </StatsContainer>

            {showDetails && typingState.startTime && (
                <DetailedStatsContainer>
                    <h4>Detailed Statistics</h4>
                    <DetailedStatsGrid>
                        <DetailedStatItem>
                            <DetailedStatValue>{detailedStats.keystrokesPerMinute}</DetailedStatValue>
                            <DetailedStatLabel>Keystrokes/min</DetailedStatLabel>
                        </DetailedStatItem>

                        <DetailedStatItem>
                            <DetailedStatValue>{detailedStats.charsPerSecond}</DetailedStatValue>
                            <DetailedStatLabel>Chars/second</DetailedStatLabel>
                        </DetailedStatItem>

                        <DetailedStatItem>
                            <DetailedStatValue>{detailedStats.currentStreak}</DetailedStatValue>
                            <DetailedStatLabel>Current Streak</DetailedStatLabel>
                        </DetailedStatItem>

                        <DetailedStatItem>
                            <DetailedStatValue>{detailedStats.longestStreak}</DetailedStatValue>
                            <DetailedStatLabel>Longest Streak</DetailedStatLabel>
                        </DetailedStatItem>

                        <DetailedStatItem>
                            <DetailedStatValue highlight={detailedStats.errorRate > 10}>{detailedStats.errorRate}%</DetailedStatValue>
                            <DetailedStatLabel>Error Rate</DetailedStatLabel>
                        </DetailedStatItem>

                        <DetailedStatItem>
                            <DetailedStatValue>{detailedStats.remainingTime}s</DetailedStatValue>
                            <DetailedStatLabel>Est. Remaining</DetailedStatLabel>
                        </DetailedStatItem>
                    </DetailedStatsGrid>
                </DetailedStatsContainer>
            )}
        </div>
    );
};

export default Stats; 
