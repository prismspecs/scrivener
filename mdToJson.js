const fs = require('fs');
const path = require('path');

// Function to read a Markdown file and convert it to formatted text
function convertMarkdownToFormattedText(filePath) {
    try {
        // Read the Markdown file
        const markdownContent = fs.readFileSync(filePath, 'utf8');

        // Convert Markdown content to formatted text
        const formattedText = markdownContent.replace(/\n{2,}/g, '\n\n').trim();

        return formattedText;
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

// Function to create JSON object with formatted text
function createJSONObject(formattedText) {
    if (!formattedText) return null;

    const jsonObject = {
        "text": formattedText
    };

    return jsonObject;
}

// Main function to execute the script
function main() {
    // Get input Markdown file path from command line argument
    const inputFilePath = process.argv[2];

    if (!inputFilePath) {
        console.error('Error: Please provide the path to the input Markdown file.');
        return;
    }

    // Check if the input file exists
    if (!fs.existsSync(inputFilePath)) {
        console.error('Error: The input file does not exist.');
        return;
    }

    // Convert Markdown to formatted text
    const formattedText = convertMarkdownToFormattedText(inputFilePath);

    // Create JSON object with formatted text
    const jsonObject = createJSONObject(formattedText);

    // Output JSON file path
    const outputFilePath = 'convert-output.json';

    // Write JSON object to output file
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonObject, null, 2), 'utf8');

    console.log('Formatted text converted and saved to convert-output.json');
}

// Execute the main function
main();
