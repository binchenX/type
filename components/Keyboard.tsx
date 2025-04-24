import React from 'react';
import styled from 'styled-components';

interface KeyboardProps {
    nextChar: string | null;
}

const KeyboardContainer = styled.div`
    margin: 20px auto;
    padding: 10px;
    max-width: 800px;
    background: #f5f5f5;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const KeyboardRow = styled.div`
    display: flex;
    justify-content: center;
    margin: 4px 0;
`;

interface KeyProps {
    width?: string;
    isHighlighted?: boolean;
}

const Key = styled.div<KeyProps>`
    width: ${props => props.width || '40px'};
    height: 40px;
    margin: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.isHighlighted ? '#4CAF50' : 'white'};
    color: ${props => props.isHighlighted ? 'white' : 'black'};
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 14px;
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(1px);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
`;

const Keyboard: React.FC<KeyboardProps> = ({ nextChar }) => {
    const rows = [
        ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
    ];

    // Define the middle point of the keyboard for determining left/right side
    const middleKeys: Record<string, string> = {
        '0': 't',  // First row
        '1': 'y',  // Second row
        '2': 'h',  // Third row
        '3': 'n'   // Fourth row
    };

    const isHighlighted = (key: string) => {
        if (!nextChar) return false;

        // Handle space key separately
        if (nextChar === ' ' && key === 'Space') return true;

        // For all other keys, compare case-insensitively
        return key.toLowerCase() === nextChar.toLowerCase();
    };

    const isShiftNeeded = () => {
        if (!nextChar) return false;
        return nextChar !== nextChar.toLowerCase();
    };

    const isLeftShift = (char: string | null) => {
        if (!char) return false;
        const lowerChar = char.toLowerCase();

        // Check each row to find which side of the keyboard the character is on
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const middleKey = middleKeys[rowIndex.toString()];
            const row = rows[rowIndex];
            const charIndex = row.indexOf(lowerChar);

            if (charIndex !== -1) {
                // If the character is in this row, find its position relative to the middle
                const middleIndex = row.indexOf(middleKey) || Math.floor(row.length / 2);
                return charIndex >= middleIndex; // Return true if char is on right side
            }
        }
        return false;
    };

    const shouldHighlightShift = (position: 'left' | 'right') => {
        if (!isShiftNeeded()) return false;
        return position === 'left' ? isLeftShift(nextChar) : !isLeftShift(nextChar);
    };

    return (
        <KeyboardContainer>
            {rows.map((row, rowIndex) => (
                <KeyboardRow key={rowIndex}>
                    {rowIndex === 0 && <Key width="40px">Esc</Key>}
                    {row.map((key, keyIndex) => (
                        <Key
                            key={keyIndex}
                            isHighlighted={isHighlighted(key)}
                        >
                            {key}
                        </Key>
                    ))}
                </KeyboardRow>
            ))}
            <KeyboardRow>
                <Key
                    width="60px"
                    isHighlighted={shouldHighlightShift('left')}
                >
                    Shift
                </Key>
                <Key width="60px">Ctrl</Key>
                <Key width="60px">Alt</Key>
                <Key
                    width="300px"
                    isHighlighted={isHighlighted('Space')}
                >
                    Space
                </Key>
                <Key width="60px">Alt</Key>
                <Key width="60px">Ctrl</Key>
                <Key
                    width="60px"
                    isHighlighted={shouldHighlightShift('right')}
                >
                    Shift
                </Key>
            </KeyboardRow>
        </KeyboardContainer>
    );
};

export default Keyboard; 
