/**
 * This script fixes common CSV file issues with quiz files
 * - Converts tabs to commas
 * - Removes empty lines
 * - Ensures at least 3 questions exist
 * 
 * Usage:
 * node fix-quiz-csv.js input.csv output.csv
 */

const fs = require('fs');

// Get command line arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'fixed_quiz.csv';

if (!inputFile) {
  console.error('Please provide an input file path.');
  console.error('Usage: node fix-quiz-csv.js input.csv output.csv');
  process.exit(1);
}

try {
  // Read the input file
  const fileContent = fs.readFileSync(inputFile, 'utf8');
  
  // Normalize line endings
  let normalizedContent = fileContent.replace(/\r\n/g, '\n');
  
  // Split into lines
  let lines = normalizedContent.split('\n');
  
  // Filter out empty lines
  lines = lines.filter(line => line.trim().length > 0);
  
  console.log(`Original file: ${lines.length} lines`);
  
  // Check if we need to convert from TSV to CSV
  const firstLine = lines[0];
  let isTabSeparated = firstLine.includes('\t');
  
  if (isTabSeparated) {
    console.log('Converting from TSV to CSV format...');
    lines = lines.map(line => line.replace(/\t/g, ','));
  }
  
  // Check for and remove example/instruction lines
  lines = lines.filter(line => {
    return !line.includes('Add your questions following this format') && 
           !line.includes('example') && 
           !line.includes('Example');
  });
  
  // Get header line
  const headerLine = lines[0];
  const headerColumns = headerLine.split(',');
  
  console.log(`Header has ${headerColumns.length} columns`);
  
  // Validate header
  if (!headerLine.toLowerCase().includes('questiontext') || 
      !headerLine.toLowerCase().includes('option1') || 
      !headerLine.toLowerCase().includes('correctoption')) {
    console.error('Warning: CSV header may be missing required columns');
    console.error('Expected columns: questionText,option1,option2,option3,option4,correctOption,points');
    
    // Fix header if needed
    if (headerColumns.length >= 7) {
      lines[0] = 'questionText,option1,option2,option3,option4,correctOption,points';
      console.log('Fixed header row');
    }
  }
  
  // Check the number of valid questions
  let validQuestions = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    
    // Basic validation - must have at least 7 columns
    if (cols.length >= 7 && cols[0].trim() && cols[1].trim() && cols[2].trim() && 
        cols[3].trim() && cols[4].trim()) {
      validQuestions++;
    } else {
      console.log(`Warning: Row ${i+1} might not be a valid question. Fixing if possible...`);
      
      // Try to fix missing columns
      while (cols.length < 7) {
        cols.push('');
      }
      
      // Fix empty options
      for (let j = 1; j <= 4; j++) {
        if (!cols[j] || !cols[j].trim()) {
          cols[j] = `Option ${j}`;
        }
      }
      
      // Fix correct option
      if (isNaN(parseInt(cols[5])) || parseInt(cols[5]) < 1 || parseInt(cols[5]) > 4) {
        cols[5] = '1';
      }
      
      // Fix points
      if (isNaN(parseInt(cols[6]))) {
        cols[6] = '1';
      }
      
      // Update the line
      lines[i] = cols.join(',');
    }
  }
  
  console.log(`Found ${validQuestions} valid questions`);
  
  // Add example questions if we don't have enough
  if (validQuestions < 3) {
    console.log(`Adding ${3 - validQuestions} example questions to meet minimum requirement`);
    
    const exampleQuestions = [
      'What is the capital of France?,London,Paris,Berlin,Madrid,2,1',
      'Which planet is known as the Red Planet?,Earth,Venus,Mars,Jupiter,3,1',
      'Who wrote the play "Romeo and Juliet"?,Charles Dickens,William Shakespeare,Jane Austen,Mark Twain,2,1'
    ];
    
    for (let i = 0; i < (3 - validQuestions); i++) {
      lines.push(exampleQuestions[i]);
    }
  }
  
  // Join lines and write output file
  const fixedContent = lines.join('\n');
  fs.writeFileSync(outputFile, fixedContent);
  
  console.log(`Fixed CSV file saved to ${outputFile}`);
  console.log(`Final file has ${lines.length} lines (${lines.length - 1} questions)`);
  
} catch (error) {
  console.error('Error processing file:', error.message);
  process.exit(1);
}
