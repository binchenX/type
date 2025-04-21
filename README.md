# Typing Practice Application

A web application for practicing typing skills using custom markdown texts. Upload your own markdown files or use the sample text to improve your typing speed and accuracy.

## Features

- Upload markdown files for typing practice
- Parse markdown content including headings, paragraphs, and list items
- Real-time statistics: WPM (Words Per Minute), accuracy, and time
- Progress tracking across multiple text sections
- Light and dark mode support
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/typing-practice.git
cd typing-practice
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload a Markdown File**: Click the upload area or drag and drop a markdown file
2. **Use Sample Text**: Alternatively, click "Use Sample Text" to practice with the provided sample
3. **Practice Typing**: Type the text displayed on the screen
4. **View Statistics**: Monitor your typing speed, accuracy, and progress in real-time
5. **Complete All Sections**: Progress through all text sections to complete the practice
6. **Practice Again**: When finished, review your results and practice again if desired

## Creating Custom Practice Files

Create markdown files with the following format for optimal practice:

```markdown
# Heading (Title)

Paragraph text for practice.

## Section Heading

- List item 1 for practice
- List item 2 for practice
- List item 3 for practice

Another paragraph for more practice.
```

The application will parse headings, paragraphs, and list items, presenting them as separate practice sections.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [styled-components](https://styled-components.com/)
- Markdown parsing with [react-markdown](https://github.com/remarkjs/react-markdown) 
