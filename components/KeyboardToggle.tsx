import { useEffect, useState } from 'react';
import styled from 'styled-components';

const ToggleButton = styled.button`
  background-color: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 0.5rem;
  
  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

interface KeyboardToggleProps {
    isKeyboardVisible: boolean;
    onToggle: () => void;
}

const KeyboardToggle: React.FC<KeyboardToggleProps> = ({ isKeyboardVisible, onToggle }) => {
    return (
        <ToggleButton onClick={onToggle} aria-label="Toggle Keyboard">
            {isKeyboardVisible ? <KeyboardHideIcon /> : <KeyboardShowIcon />}
        </ToggleButton>
    );
};

// Icon for showing keyboard
const KeyboardShowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="6" y2="8" />
        <line x1="10" y1="8" x2="10" y2="8" />
        <line x1="14" y1="8" x2="14" y2="8" />
        <line x1="18" y1="8" x2="18" y2="8" />
        <line x1="6" y1="12" x2="6" y2="12" />
        <line x1="10" y1="12" x2="10" y2="12" />
        <line x1="14" y1="12" x2="14" y2="12" />
        <line x1="18" y1="12" x2="18" y2="12" />
        <line x1="6" y1="16" x2="18" y2="16" />
    </svg>
);

// Icon for hiding keyboard
const KeyboardHideIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="6" y2="8" />
        <line x1="10" y1="8" x2="10" y2="8" />
        <line x1="14" y1="8" x2="14" y2="8" />
        <line x1="18" y1="8" x2="18" y2="8" />
        <line x1="6" y1="12" x2="6" y2="12" />
        <line x1="10" y1="12" x2="10" y2="12" />
        <line x1="14" y1="12" x2="14" y2="12" />
        <line x1="18" y1="12" x2="18" y2="12" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
);

export default KeyboardToggle; 
