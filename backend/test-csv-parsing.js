const csv = require('csv-parser');
const fs = require('fs');

console.log('Testing CSV parsing...');

// Test tab-separated file
const rows = [];
const firstLine = fs.readFileSync('./test-students-tabs.csv', 'utf8').split('\n')[0];
const delimiter = firstLine.includes('\t') ? '\t' : ',';
console.log('First line:', JSON.stringify(firstLine));
console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');

fs.createReadStream('./test-students-tabs.csv')
  .pipe(csv({ 
    separator: delimiter,
    mapHeaders: ({ header }) => header.trim().toLowerCase()
  }))
  .on('data', (data) => {
    console.log('Row data:', data);
    rows.push(data);
  })
  .on('end', () => {
    console.log('Total rows:', rows.length);
    console.log('Headers:', Object.keys(rows[0] || {}));
  })
  .on('error', (error) => {
    console.error('CSV parsing error:', error);
  });
