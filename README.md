# Typing Practice Application

A web application for practicing typing skills using custom markdown texts. Upload your own markdown files or use the sample text to improve your typing speed and accuracy.

## Features

- Upload markdown files for typing practice
- Parse markdown content including headings, paragraphs, and list items
- Real-time statistics: WPM (Words Per Minute), accuracy, and time
- Progress tracking across multiple text sections
- Light and dark mode support
- Responsive design for desktop and mobile
- **AI-powered practice text generation** based on your typing errors

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Local Ollama instance (optional, for AI-generated practice)

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
6. **Generate Focused Practice**: After completion, use the AI to generate practice text focused on your problematic characters
7. **Practice Again**: When finished, review your results and practice again if desired

## AI-Powered Practice Generation

The application can generate custom practice texts focused on the characters you struggle with most. This feature works by:

1. Tracking your typing errors during practice sessions
2. Identifying your most problematic characters
3. Using an LLM to generate custom practice sentences that feature those characters
4. Allowing you to practice specifically with these targeted sentences

### LLM Integration

By default, the application is configured to work with a local Ollama instance. The system:

- Collects your typing error statistics
- Creates a prompt highlighting your problematic characters
- Sends this prompt to your local Ollama instance
- Formats the generated text into practice sentences

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Next.js Frontend                              │
│                                                                         │
│  ┌─────────────────┐       ┌────────────────┐      ┌────────────────┐   │
│  │     pages/      │       │  components/   │      │   services/    │   │
│  │    index.tsx    │◄─────►│   Results.tsx  │◄────►│practiceService.│   │
│  │                 │       │                │      │      ts        │   │
│  └─────────────────┘       └────────────────┘      └───────┬────────┘   │
│                                                            │            │
└────────────────────────────────────────────────────────────┼────────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────┴────────────┐
│                          Next.js API Route                              │
│                                                                         │
│                        pages/api/generate-practice.ts                   │
│                                                                         │
│                          ┌─────────────────┐                            │
│                          │   Error Data    │                            │
│                          │   Processing    │                            │
│                          └────────┬────────┘                            │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌─────────────────┐                            │
│                          │  Prompt Builder │                            │
│                          └────────┬────────┘                            │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌─────────────────┐                            │
│                          │   LLM Handler   │                            │
│                          └────────┬────────┘                            │
│                                   │                                     │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┴─────────────────────────────────────┐
│                          Local Ollama Instance                          │
│                                                                         │
│                          http://localhost:11434                         │
│                                                                         │
│                              ┌───────────┐                              │
│                              │  LLM API  │                              │
│                              └───────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

#### How It Works:

1. **Error Collection**: As you type, the application tracks which characters you struggle with
2. **Data Processing**: When you request practice text, your error data is analyzed
3. **Prompt Creation**: A prompt is created highlighting your problematic characters
4. **LLM Integration**: The prompt is sent to your local Ollama instance
5. **Content Generation**: Ollama generates custom practice sentences
6. **Practice Session**: You can immediately start practicing with these targeted sentences

#### Customization:

The LLM integration is designed to be extensible:
- You can modify the prompt format in `pages/api/generate-practice.ts`
- The default connection is to a local Ollama instance, but can be changed to any LLM provider
- Environment variables allow configuring the connection details

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
- AI features powered by [Ollama](https://ollama.ai/) 
