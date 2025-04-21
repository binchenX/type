import { useState, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const DropArea = styled.div`
  width: 100%;
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover, &:focus {
    border-color: var(--primary);
  }

  &.dragging {
    background-color: var(--background-light);
    border-color: var(--primary);
  }
`;

const Instructions = styled.p`
  color: var(--text-light);
  margin-bottom: 1rem;
`;

const UploadButton = styled.button`
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--primary-dark);
  }
`;

const FileInput = styled.input`
  display: none;
`;

const SampleButton = styled.button`
  background-color: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--primary);
    color: white;
  }
`;

interface UploadAreaProps {
    onUpload: (content: string) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                onUpload(content);
            }
        };

        reader.readAsText(file);
    };

    const handleSampleClick = () => {
        const sampleMarkdown = `
- The quick brown fox jumps over the lazy dog.
- She sells seashells by the seashore.
- How much wood would a woodchuck chuck if a woodchuck could chuck wood?
- "Code is like humor. When you have to explain it, it's bad." - Cory House
- "The best error message is the one that never shows up." - Thomas Fuchs`;

        onUpload(sampleMarkdown);
    };

    return (
        <UploadContainer>
            <h2>Upload a Markdown File</h2>
            <p>Upload a markdown file with list items.</p>

            <DropArea
                className={isDragging ? 'dragging' : ''}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <Instructions>
                    Drag & drop a markdown file here or click to browse
                </Instructions>
                <UploadButton type="button">Choose File</UploadButton>
                <FileInput
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".md, .markdown, .txt"
                />
            </DropArea>

            <div>
                <p>Don't have a markdown file?</p>
                <SampleButton onClick={handleSampleClick}>
                    Use Sample Text
                </SampleButton>
            </div>
        </UploadContainer>
    );
};

export default UploadArea; 
