# Testing Quiz Feature End-to-End

This guide will help you test the quiz feature in your SGT E-Learning platform.

## Prerequisites
- Backend server is running
- MongoDB connection is established
- You have a teacher account, student account, and admin account
- There is at least one course with a teacher assigned
- There is at least one video uploaded to a course

## Testing Flow

### 1. Authentication
First, you need to authenticate and get JWT tokens for testing:

1. Login as teacher
2. Login as student
3. Login as admin (optional)

Save these tokens for subsequent requests.

### 2. Teacher Flow

#### Get Course and Video Information
1. Get the teacher's courses to obtain a courseId
2. Get the videos for a specific course to obtain a videoId

#### Create a Quiz
1. Download the quiz template CSV file
2. Fill out the CSV with quiz questions (follow the template format)
3. Upload the quiz with the following information:
   - Title
   - Description (optional)
   - Course ID
   - Video ID
   - Time limit (default: 30 minutes)
   - Passing score (default: 60%)

#### Monitor Quiz Analytics
1. View all quizzes for a course
2. View quiz analytics for a specific quiz
3. View student results

### 3. Student Flow

#### Take a Quiz
1. View quizzes available for a course
2. Get a specific quiz for a video
3. Take the quiz (submit answers)
4. View quiz results

### 4. Admin Flow (Optional)
1. View all quizzes across courses
2. View analytics across all quizzes

## Testing Notes

- The quiz feature is tied to videos, so each video can have one quiz associated with it
- Students can only take a quiz once
- Quiz analytics provide insights into student performance
- Teachers can only access quizzes for courses they are assigned to

## Common Issues

- If you receive 401 errors, your JWT token might have expired
- If you receive 403 errors, the user doesn't have permission for that resource
- Make sure CSV file follows the exact template format when uploading quizzes

## Sample Quiz CSV Format

```
questionText,option1,option2,option3,option4,correctOption,points
What is the capital of France?,London,Paris,Berlin,Madrid,2,1
Which planet is known as the Red Planet?,Earth,Venus,Mars,Jupiter,3,1
```

Note: correctOption is 1-based (1,2,3,4) in the CSV but stored as 0-based in the database.
