import React from 'react';
import styled from 'styled-components';

interface LoadingSpinnerProps {
    message?: string;
    subMessage?: string;
    size?: 'small' | 'medium' | 'large';
}

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    width: 100%;
    color: var(--text);
`;

const SpinnerOuter = styled.div<{ size: string }>`
    display: inline-block;
    width: ${props => props.size === 'small' ? '30px' : props.size === 'large' ? '70px' : '50px'};
    height: ${props => props.size === 'small' ? '30px' : props.size === 'large' ? '70px' : '50px'};
    position: relative;
    margin-bottom: 1.5rem;
`;

const SpinnerInner = styled.div`
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    border: 3px solid var(--background-light);
    border-radius: 50%;
    animation: ripple 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: var(--primary) transparent transparent transparent;
    
    &:nth-child(1) {
        animation-delay: -0.45s;
    }
    
    &:nth-child(2) {
        animation-delay: -0.3s;
    }
    
    &:nth-child(3) {
        animation-delay: -0.15s;
    }
    
    @keyframes ripple {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const LoadingText = styled.div<{ size: string }>`
    font-size: ${props => props.size === 'small' ? '1rem' : props.size === 'large' ? '1.5rem' : '1.2rem'};
    margin-bottom: 0.5rem;
    font-weight: 500;
`;

const LoadingSubText = styled.div<{ size: string }>`
    font-size: ${props => props.size === 'small' ? '0.8rem' : props.size === 'large' ? '1.1rem' : '0.9rem'};
    color: var(--text-light);
    max-width: 80%;
`;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = "Loading...",
    subMessage,
    size = 'medium'
}) => {
    return (
        <LoadingContainer>
            <SpinnerOuter size={size}>
                <SpinnerInner />
                <SpinnerInner />
                <SpinnerInner />
                <SpinnerInner />
            </SpinnerOuter>
            <LoadingText size={size}>{message}</LoadingText>
            {subMessage && <LoadingSubText size={size}>{subMessage}</LoadingSubText>}
        </LoadingContainer>
    );
};

export default LoadingSpinner; 
