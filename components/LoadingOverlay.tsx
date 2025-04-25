import React from 'react';
import styled from 'styled-components';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
    subMessage?: string;
}

const OverlayContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    backdrop-filter: blur(3px);
`;

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    message = "Loading...",
    subMessage
}) => {
    if (!isLoading) return null;

    return (
        <OverlayContainer>
            <LoadingSpinner
                message={message}
                subMessage={subMessage}
                size="large"
            />
        </OverlayContainer>
    );
};

export default LoadingOverlay; 
