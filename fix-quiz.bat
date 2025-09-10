@echo off
echo SGT E-Learning Quiz CSV Fixer
echo -------------------------------
echo.

if "%~1"=="" (
  echo Error: Please provide an input file.
  echo Usage: fix-quiz.bat input.csv [output.csv]
  echo.
  echo Example: fix-quiz.bat my-quiz.csv fixed-quiz.csv
  exit /b 1
)

set INPUT_FILE=%~1
set OUTPUT_FILE=%~2

if "%OUTPUT_FILE%"=="" (
  set OUTPUT_FILE=fixed-%INPUT_FILE%
)

echo Input file: %INPUT_FILE%
echo Output file: %OUTPUT_FILE%
echo.

node backend/fix-quiz-csv.js %INPUT_FILE% %OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Success! Your fixed CSV file is ready.
  echo You can now upload %OUTPUT_FILE% to the quiz system.
)

pause
