# Quiz CSV Troubleshooting Guide

## Common Issues with Quiz CSV Files

This guide will help you correctly format your quiz CSV files to avoid validation errors when uploading quizzes.

## Correct CSV Format

A valid quiz CSV file must:
1. Use commas (,) to separate values
2. Include a header row
3. Contain at least 3 valid quiz questions
4. Have no empty rows

## Example of a Valid CSV File

```
questionText,option1,option2,option3,option4,correctOption,points
What is the largest ocean in the world?,The Pacific Ocean,The Atlantic Ocean,The Indian Ocean,The Arctic Ocean,1,1
How many states are there in India?,28,29,30,31,1,1
What is the capital of India?,New Delhi,Mumbai,Kolkata,Chennai,1,1
```

## Common Errors and Solutions

### 1. Using Tabs Instead of Commas

**Problem**: Your file uses tab characters to separate values (TSV format) instead of commas.

**Solution**: Save your file with comma separators instead of tabs.

### 2. Empty Rows

**Problem**: Your CSV has blank lines that aren't counted as valid questions.

**Solution**: Remove all empty rows from your CSV file.

### 3. Not Enough Questions

**Problem**: You need at least 3 valid questions plus the header row.

**Solution**: Ensure your CSV has at least 4 rows total (1 header row + 3 question rows).

### 4. Incorrect Header Row

**Problem**: The header row is missing required columns.

**Solution**: Make sure your header row has exactly these column names:
```
questionText,option1,option2,option3,option4,correctOption,points
```

### 5. Commas in Text Fields

**Problem**: Questions or options containing commas break the CSV format.

**Solution**: Enclose any text containing commas in double quotes.
```
"What colors, in order, are in the rainbow?",Red,Orange,Yellow,Green,1,1
```

## Step-by-Step Guide to Create a Valid Quiz CSV

1. Open a spreadsheet program (Excel, Google Sheets)
2. Add the header row with exact column names
3. Add at least 3 questions with 4 options each
4. Set the correct option (1-4) and points (typically 1)
5. Save/Export as CSV format
6. Verify no empty rows exist in the file

## Need Help?

Use the sample CSV files provided:
- `backend/fixed_quiz_template.csv`
- `backend/fixed_india_quiz.csv`
- `backend/sample_quiz.csv`

These are guaranteed to pass validation when uploaded.
