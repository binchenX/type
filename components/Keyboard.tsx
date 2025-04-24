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

    const isHighlighted = (key: string) => {
        if (!nextChar) return false;
        return key.toLowerCase() === nextChar.toLowerCase();
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
                <Key width="60px">Shift</Key>
                <Key width="60px">Ctrl</Key>
                <Key width="60px">Alt</Key>
                <Key width="300px">Space</Key>
                <Key width="60px">Alt</Key>
                <Key width="60px">Ctrl</Key>
                <Key width="60px">Shift</Key>
            </KeyboardRow>
        </KeyboardContainer>
    );
};

export default Keyboard; 
