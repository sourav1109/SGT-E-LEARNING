# Unit-Based Video Organization

## Overview

The SGT E-Learning platform now supports organizing course videos into units. This allows for better structuring of course content and a more organized learning experience for students.

## Features

1. **Unit Organization**: Videos can be organized into logical units within a course.
2. **Unit Unlocking**: Units are progressively unlocked as students complete previous units.
3. **Progress Tracking**: Student progress is tracked at both the video and unit levels.
4. **Analytics**: Detailed analytics are available for both videos and units.

## How It Works

### For Administrators and Teachers

1. Create units for a course through the admin or teacher interface
2. Assign videos to specific units
3. Set the unit order (determines the sequence in which units are presented to students)
4. Upload videos directly to units

### For Students

1. Students see units in their course interface
2. The first unit is automatically unlocked
3. Students must complete a unit to unlock the next one
4. Progress is tracked for each video and unit

## Technical Implementation

### Key Models

- **Course**: Now includes a `hasUnits` flag and references to units
- **Unit**: Contains videos and other learning materials with an `order` field to determine sequence
- **Video**: Contains a reference to its unit
- **StudentProgress**: Tracks which units and videos are unlocked and completed

### Key Components

- **StudentCourseUnits.js**: Main interface for students to view units
- **StudentUnitVideo.js**: Interface for watching videos within a unit
- **CourseVideos.js**: Legacy component updated to handle both unit and non-unit based courses

### API Endpoints

- GET `/api/student/course/:courseId/videos`: Returns videos (grouped by units if available)
- GET `/api/unit/student/course/:courseId`: Returns units with progress for student
- POST `/api/student/video/:videoId/watch`: Updates watch history and unlocks next units when appropriate

## Testing

Run the test script to verify the unit-based system is working correctly:

```
node test-unit-system.js
```

This script will:
1. Check for courses with units
2. Create test data if none exists
3. Verify student progress records
4. Validate unit unlocking and video completion tracking

## Backwards Compatibility

The system maintains backwards compatibility with courses that don't use units. The `CourseVideos.js` component has been updated to handle both unit-based and non-unit-based course structures.

## Future Enhancements

1. Implement unit quizzes that must be passed to unlock the next unit
2. Add support for unit prerequisites beyond simple sequential order
3. Create unit-based analytics dashboards for teachers
4. Support for drag-and-drop unit organization in the admin interface
