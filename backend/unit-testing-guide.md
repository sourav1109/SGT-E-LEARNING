# Unit-Based Video System Testing Guide

This guide helps administrators and teachers test the newly implemented unit-based video organization system.

## Prerequisites

1. Admin or teacher account with access to at least one course
2. Student account assigned to the course
3. Several video files ready for upload

## Testing Process for Administrators

### 1. Create Units for a Course

1. Log in as an administrator
2. Navigate to the course management page
3. Select a course or create a new one
4. Go to the "Units" tab or section
5. Create at least 2 units:
   - Unit 1: "Introduction" (order: 0)
   - Unit 2: "Advanced Topics" (order: 1)

### 2. Upload Videos to Units

1. Navigate to the video upload page
2. Upload a video
3. Select the course and unit for the video
4. Repeat for at least 2 videos per unit
5. Verify videos appear in the correct units

### 3. Verify Course Structure

1. View the course details
2. Confirm the `hasUnits` flag is set to true
3. Verify units are listed in the correct order
4. Verify videos are properly associated with units

### 4. Test Student Access

1. Assign a student to the course if not already assigned
2. Log in as the student
3. Navigate to the course
4. Verify the student can see the units view
5. Verify only the first unit is unlocked
6. Watch videos in the first unit
7. Complete all videos in the first unit to unlock the next unit

## Testing Process for Teachers

### 1. Create and Manage Units

1. Log in as a teacher
2. Navigate to your courses
3. Select a course
4. Create units and organize videos
5. Reorder units if needed
6. Test adding and removing videos from units

### 2. Monitor Student Progress

1. View student progress at the unit level
2. Check which units students have completed
3. Verify analytics data is properly collected

## Troubleshooting

If students report issues with the unit-based system:

1. Check if the `hasUnits` flag is properly set on the course
2. Verify student progress records exist and have the correct unit information
3. Confirm that unit unlocking logic works correctly
4. Check that videos are properly associated with units

## Running Diagnostic Scripts

As an administrator, you can run these scripts to diagnose and fix issues:

1. `node fix-unit-system.js` - Diagnoses potential issues with the unit system
2. `node fix-course-units.js` - Fixes incorrect `hasUnits` flags on courses
3. `node test-unit-system.js` - Tests the unit-based system and creates test data if needed

## Expected Behavior

- The first unit (order 0) should be automatically unlocked for all students
- When all videos in a unit are completed, the next unit should be automatically unlocked
- The legacy course videos view should display all videos from all unlocked units
- Each video should display its unit information in the legacy view
- Progress should be tracked both at the video and unit levels
