const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for the React app
app.use(cors());
app.use(bodyParser.json());

// Endpoint to generate practice text based on error statistics
app.post('/api/generate-practice', (req, res) => {
    const { errorFrequencyMap } = req.body;

    // Process the error data to create a prompt for the LLM
    const problematicChars = Object.entries(errorFrequencyMap)
        .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
        .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
        .slice(0, 10)
        .map(([char, stats]) => ({
            char,
            errorRate: Math.round((stats.errors / stats.attempts) * 100)
        }));

    if (problematicChars.length === 0) {
        return res.json({
            success: true,
            text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
            practiceSections: [
                "The quick brown fox jumps over the lazy dog.",
                "Amazingly few discotheques provide jukeboxes.",
                "How vexingly quick daft zebras jump!"
            ]
        });
    }

    // Create prompt for the LLM
    const charsList = problematicChars.map(item =>
        `${item.char === ' ' ? 'SPACE' : item.char} (${item.errorRate}% error rate)`
    ).join(', ');

    const prompt = `Generate 5 short sentences or phrases for typing practice. 
Each line should be a separate practice item.
These practice items should heavily feature the following characters that the user struggles with: ${charsList}.
Make the sentences interesting, memorable and progressively more challenging. 
Each sentence should be between 40-60 characters.
Don't include explanations, just the practice text.`;

    // This is where you would call your local LLM
    // For demonstration, we'll simulate the call and return mock data
    // In a real implementation, you would replace this with code to call your specific LLM

    // Example command to call a local LLM (uncomment and modify as needed)
    /*
    const llmCommand = `your_llm_command --prompt "${prompt}"`;
    
    exec(llmCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing LLM: ${error}`);
        return res.status(500).json({ success: false, error: 'Failed to generate text' });
      }
      
      const generatedText = stdout.trim();
      const practiceSections = generatedText.split('\n').filter(line => line.trim() !== '');
      
      return res.json({
        success: true,
        prompt,
        text: "Here are practice sentences focused on your problematic characters:",
        practiceSections
      });
    });
    */

    // Mock response (replace with actual LLM call)
    setTimeout(() => {
        const mockPracticeSections = generateMockPractice(problematicChars);

        res.json({
            success: true,
            prompt,
            text: "Here are practice sentences focused on your problematic characters:",
            practiceSections: mockPracticeSections
        });
    }, 500);
});

// Helper function to generate mock practice text based on problematic characters
function generateMockPractice(problematicChars) {
    const chars = problematicChars.map(item => item.char);

    // Generate sentences that include the problematic characters
    const sentences = [];

    if (chars.includes(',')) {
        sentences.push("Carefully, quietly, slowly, move forward with grace.");
    }

    if (chars.includes('.')) {
        sentences.push("Type each word. Then each sentence. Practice makes perfect.");
    }

    if (chars.includes(' ')) {
        sentences.push("Space between words improves readability and clarity.");
    }

    if (chars.includes('s')) {
        sentences.push("She sells seashells by the seashore in summer season.");
    }

    if (chars.includes('t')) {
        sentences.push("The talented turtle tried to type ten terrific texts.");
    }

    // Add generic sentences if we don't have enough
    const genericSentences = [
        "The five boxing wizards jump quickly over the lazy dog.",
        "How vexingly quick daft zebras jump when motivated.",
        "Pack my box with five dozen quality jugs, please.",
        "Amazingly few discotheques provide jukeboxes nowadays.",
        "The job requires extra pluck and zeal from every young wage earner."
    ];

    while (sentences.length < 5) {
        const randomIndex = Math.floor(Math.random() * genericSentences.length);
        const sentence = genericSentences[randomIndex];
        if (!sentences.includes(sentence)) {
            sentences.push(sentence);
        }
    }

    return sentences.slice(0, 5);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/generate-practice`);
}); 
