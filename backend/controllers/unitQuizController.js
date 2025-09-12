const Quiz = require('../models/Quiz');
const QuizPool = require('../models/QuizPool');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProgress = require('../models/StudentProgress');
const Unit = require('../models/Unit');
const Course = require('../models/Course');
const User = require('../models/User');

// Check if unit quiz is available for student
exports.checkUnitQuizAvailability = async (req, res) => {
  try {
    const { unitId } = req.params;
    const studentId = req.user._id;

    // Get unit and course info
    const unit = await Unit.findById(unitId).populate('course').populate('quizPool');
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Check student progress for this unit
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: unit.course._id 
    });

    if (!progress) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
    if (!unitProgress) {
      return res.status(403).json({ message: 'Unit not accessible' });
    }

    // Check if all videos in unit are watched - use multiple methods for reliability
    const totalVideos = unit.videos.length;
    let allVideosWatched = false;
    
    if (totalVideos === 0) {
      allVideosWatched = true; // No videos to watch
    } else {
      // Method 1: Check via videosWatched array
      const watchedViaArray = unitProgress.videosWatched.filter(v => v.completed).length;
      
      // Method 2: Check videosCompleted counter
      const watchedViaCounter = unitProgress.videosCompleted || 0;
      
      // Method 3: Check individual video progress entries
      const videoProgressEntries = progress.videoProgress || [];
      const watchedViaEntries = unit.videos.filter(video => {
        const videoProgress = videoProgressEntries.find(vp => vp.videoId.toString() === video._id.toString());
        return videoProgress && videoProgress.completed;
      }).length;
      
      // Method 4: Check global completedVideos array for this unit's videos
      const completedVideosGlobal = progress.completedVideos || [];
      const watchedViaGlobal = unit.videos.filter(video => 
        completedVideosGlobal.includes(video._id.toString())
      ).length;
      
      // Use the highest count as the most reliable indicator
      const maxWatchedCount = Math.max(watchedViaArray, watchedViaCounter, watchedViaEntries, watchedViaGlobal);
      allVideosWatched = maxWatchedCount >= totalVideos;
      
      console.log('Quiz availability check:', {
        unitId,
        totalVideos,
        watchedViaArray,
        watchedViaCounter, 
        watchedViaEntries,
        watchedViaGlobal,
        maxWatchedCount,
        allVideosWatched
      });
    }

    // Check if quiz already completed and passed
    const quizCompleted = unitProgress.unitQuizCompleted;
    const quizPassed = unitProgress.unitQuizPassed;

    // Check if there's a quiz pool for this unit
    const hasQuiz = unit.quizPool || unit.quizzes.length > 0;

    const available = hasQuiz && allVideosWatched;

    res.json({
      available,
      unitId,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      allVideosWatched,
      quizAvailable: available,
      quizCompleted,
      quizPassed,
      canTakeQuiz: hasQuiz && allVideosWatched && !quizPassed,
      totalVideos,
      watchedVideos: Math.max(
        unitProgress.videosWatched.filter(v => v.completed).length,
        unitProgress.videosCompleted || 0
      ),
      message: available ? 'Quiz is available' : 
        !hasQuiz ? 'No quiz configured for this unit' :
        !allVideosWatched ? 'Complete all videos before taking the quiz' : 
        'Quiz not available'
    });
  } catch (err) {
    console.error('Error checking unit quiz availability:', err);
    res.status(500).json({ message: err.message });
  }
};

// Generate random quiz for unit
exports.generateUnitQuiz = async (req, res) => {
  try {
    const { unitId } = req.params;
    const studentId = req.user._id;

    // Get unit with quiz pool
    const unit = await Unit.findById(unitId).populate('course').populate('quizPool');
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    console.log('Unit structure:', {
      id: unit._id,
      title: unit.title,
      hasQuizPool: !!unit.quizPool,
      quizPoolId: unit.quizPool?._id,
      hasQuizzes: !!unit.quizzes,
      quizzesLength: unit.quizzes?.length || 0,
      videosLength: unit.videos?.length || 0
    });

    // Check if student can take quiz
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: unit.course._id 
    });

    const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
    if (!unitProgress) {
      return res.status(403).json({ message: 'Unit not accessible' });
    }

    // Check if all videos are watched - use multiple methods for reliability
    const totalVideos = unit.videos.length;
    let allVideosWatched = false;
    
    if (totalVideos === 0) {
      allVideosWatched = true; // No videos to watch
    } else {
      // Method 1: Check via videosWatched array
      const watchedViaArray = unitProgress.videosWatched.filter(v => v.completed).length;
      
      // Method 2: Check videosCompleted counter
      const watchedViaCounter = unitProgress.videosCompleted || 0;
      
      // Method 3: Check individual video progress entries
      const videoProgressEntries = progress.videoProgress || [];
      const watchedViaEntries = unit.videos.filter(video => {
        const videoProgress = videoProgressEntries.find(vp => vp.videoId.toString() === video._id.toString());
        return videoProgress && videoProgress.completed;
      }).length;
      
      // Use the highest count as the most reliable indicator
      const maxWatchedCount = Math.max(watchedViaArray, watchedViaCounter, watchedViaEntries);
      allVideosWatched = maxWatchedCount >= totalVideos;
      
      console.log('Quiz generation check:', {
        unitId,
        totalVideos,
        watchedViaArray,
        watchedViaCounter, 
        watchedViaEntries,
        maxWatchedCount,
        allVideosWatched
      });
    }

    if (!allVideosWatched) {
      return res.status(403).json({ message: 'Complete all videos before taking the quiz' });
    }

    // Check if already passed
    if (unitProgress.unitQuizPassed) {
      return res.status(403).json({ message: 'Quiz already passed for this unit' });
    }

    let selectedQuestions = [];
    let quizSource = null;

    // Check if unit has a quiz pool
    if (unit.quizPool) {
      console.log('Unit has quiz pool:', unit.quizPool._id);
      const quizPool = await QuizPool.findById(unit.quizPool._id).populate('quizzes');
      if (!quizPool) {
        console.log('Quiz pool not found');
        return res.status(400).json({ message: 'Quiz pool not found' });
      }
      
      // Collect all questions from all quizzes in the pool
      let allQuestions = [];
      if (quizPool.quizzes && quizPool.quizzes.length > 0) {
        for (const quiz of quizPool.quizzes) {
          if (quiz.questions && quiz.questions.length > 0) {
            allQuestions.push(...quiz.questions.map(q => ({
              ...q.toObject(),
              quizId: quiz._id
            })));
          }
        }
      }
      
      console.log('Total questions found in quiz pool:', allQuestions.length);
      
      if (allQuestions.length < 10) {
        console.log('Insufficient questions in quiz pool:', allQuestions.length);
        return res.status(400).json({ message: `Insufficient questions in quiz pool. Found ${allQuestions.length} questions, need at least 10.` });
      }

      // Randomly select 10 questions
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, 10).map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points || 1,
        quizId: q.quizId
      }));
      quizSource = { quizPool: unit.quizPool._id };
    } else if (unit.quizzes && unit.quizzes.length > 0) {
      console.log('Unit has quizzes:', unit.quizzes.length);
      // Use questions from unit quizzes
      const quiz = await Quiz.findById(unit.quizzes[0]);
      if (!quiz) {
        console.log('Quiz not found');
        return res.status(400).json({ message: 'Quiz not found' });
      }
      if (!quiz.questions || quiz.questions.length < 10) {
        console.log('Insufficient questions in quiz:', quiz.questions?.length || 0);
        return res.status(400).json({ message: 'Insufficient questions in quiz' });
      }

      const shuffled = [...quiz.questions].sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, 10).map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points || 1
      }));
      quizSource = { quiz: quiz._id };
    } else {
      return res.status(400).json({ message: 'No quiz available for this unit' });
    }

    // Check for existing quiz attempts for this unit
    let existingAttempt;
    if (unit.quizPool) {
      // For quiz pool, check by student, unit, and quizPool
      existingAttempt = await QuizAttempt.findOne({
        student: studentId,
        unit: unitId,
        quizPool: unit.quizPool._id,
        completedAt: { $exists: false } // Only check for incomplete attempts
      });
    } else {
      // For regular quiz, check by student and quiz
      existingAttempt = await QuizAttempt.findOne({
        student: studentId,
        quiz: unit.quizzes[0],
        completedAt: { $exists: false } // Only check for incomplete attempts
      });
    }

    // If there's an existing incomplete attempt, check if destroyIncomplete param is set
    if (existingAttempt) {
      if (req.query.destroyIncomplete === 'true') {
        // Delete the incomplete attempt and proceed to create a new one
        await existingAttempt.deleteOne();
        console.log('Destroyed existing incomplete quiz attempt:', existingAttempt._id);
      } else {
        console.log('Found existing incomplete quiz attempt:', existingAttempt._id);
        const quizForStudent = {
          attemptId: existingAttempt._id,
          unitTitle: unit.title,
          courseTitle: unit.course.title,
          timeLimit: 30, // 30 minutes
          questions: existingAttempt.questions.map((q, index) => ({
            questionNumber: index + 1,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            points: q.points
          }))
        };
        return res.json({ ...quizForStudent, incomplete: true });
      }
    }

    // Create quiz attempt
    const quizAttempt = new QuizAttempt({
      ...quizSource,
      student: studentId,
      course: unit.course._id,
      unit: unitId,
      questions: selectedQuestions,
      answers: [],
      score: 0,
      maxScore: selectedQuestions.reduce((sum, q) => sum + q.points, 0),
      percentage: 0,
      passed: false,
      startedAt: new Date()
    });

    console.log('Creating new quiz attempt with data:', {
      student: studentId,
      course: unit.course._id,
      unit: unitId,
      quizPool: quizSource.quizPool || null,
      quiz: quizSource.quiz || null,
      questionsCount: selectedQuestions.length
    });

    await quizAttempt.save();

    // Return quiz questions without correct answers
    const quizForStudent = {
      attemptId: quizAttempt._id,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      timeLimit: 30, // 30 minutes
      questions: selectedQuestions.map((q, index) => ({
        questionNumber: index + 1,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      }))
    };

    res.json(quizForStudent);
  } catch (err) {
    console.error('Error generating unit quiz:', err);
    res.status(500).json({ message: err.message });
  }
};

// Submit quiz answers
exports.submitUnitQuiz = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body; // Array of {questionId, selectedOption}
    const studentId = req.user._id;

    // Get quiz attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Not your quiz attempt' });
    }

    if (attempt.completedAt) {
      return res.status(400).json({ message: 'Quiz already submitted' });
    }

    // Grade the quiz
    let score = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const question = attempt.questions.find(q => q.questionId.toString() === answer.questionId);
      if (question) {
        const isCorrect = question.correctOption === answer.selectedOption;
        const points = isCorrect ? question.points : 0;
        score += points;

        gradedAnswers.push({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect,
          points
        });
      }
    }

    const percentage = Math.round((score / attempt.maxScore) * 100);
    const passed = percentage >= 70;

    // Update quiz attempt
    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.completedAt = new Date();
    attempt.timeSpent = Math.round((Date.now() - attempt.startedAt) / 1000);

    await attempt.save();

    // Update student progress
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: attempt.course 
    });

    if (progress) {
      const unitProgress = progress.units.find(u => u.unitId.toString() === attempt.unit.toString());
      if (unitProgress) {
        // Add quiz attempt to unit progress
        unitProgress.quizAttempts.push({
          quizId: attempt.quiz,
          quizPoolId: attempt.quizPool,
          attemptId: attempt._id,
          score,
          maxScore: attempt.maxScore,
          percentage,
          passed,
          completedAt: attempt.completedAt
        });

        unitProgress.unitQuizCompleted = true;
        unitProgress.unitQuizPassed = passed;

        if (passed) {
          unitProgress.status = 'completed';
          unitProgress.completedAt = new Date();

          // Unlock next unit
          await unlockNextUnit(progress, attempt.course, attempt.unit);
        }

        await progress.save();
      }
    }

    // Return results
    res.json({
      attemptId: attempt._id,
      score,
      maxScore: attempt.maxScore,
      percentage,
      passed,
      passingScore: 70,
      message: passed ? 'Congratulations! You passed the quiz.' : 'You need 70% to pass. Please review the content and try again.',
      nextUnitUnlocked: passed
    });
  } catch (err) {
    console.error('Error submitting unit quiz:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper function to unlock next unit
async function unlockNextUnit(progress, courseId, currentUnitId) {
  try {
    // Get current unit to find its order
    const currentUnit = await Unit.findById(currentUnitId);
    if (!currentUnit) return;

    // Find next unit by order
    const nextUnit = await Unit.findOne({
      course: courseId,
      order: currentUnit.order + 1
    });

    if (nextUnit) {
      // Check if next unit exists in progress
      let nextUnitProgress = progress.units.find(u => u.unitId.toString() === nextUnit._id.toString());
      
      if (!nextUnitProgress) {
        // Add next unit to progress
        progress.units.push({
          unitId: nextUnit._id,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: [],
          quizAttempts: [],
          unitQuizCompleted: false,
          unitQuizPassed: false,
          allVideosWatched: false
        });
      } else {
        // Unlock existing unit
        nextUnitProgress.unlocked = true;
        nextUnitProgress.status = 'in-progress';
        nextUnitProgress.unlockedAt = new Date();
      }

      // Unlock only the first video in the next unit
      const nextUnitWithVideos = await Unit.findById(nextUnit._id).populate('videos');
      if (nextUnitWithVideos && nextUnitWithVideos.videos.length > 0) {
        // Sort videos by sequence and unlock only the first one
        const sortedVideos = nextUnitWithVideos.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const firstVideoId = sortedVideos[0]._id;
        
        if (!progress.unlockedVideos.includes(firstVideoId)) {
          progress.unlockedVideos.push(firstVideoId);
          console.log('Unlocked first video of next unit:', firstVideoId);
        }
      }
    }
  } catch (err) {
    console.error('Error unlocking next unit:', err);
  }
}

// Get quiz results
exports.getQuizResults = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate('unit', 'title')
      .populate('course', 'title');

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Not your quiz attempt' });
    }

    // Return detailed results
    const results = {
      attemptId: attempt._id,
      unitTitle: attempt.unit.title,
      courseTitle: attempt.course.title,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt,
      questions: attempt.questions.map((question, index) => {
        const answer = attempt.answers.find(a => a.questionId.toString() === question.questionId.toString());
        return {
          questionNumber: index + 1,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          selectedOption: answer ? answer.selectedOption : null,
          isCorrect: answer ? answer.isCorrect : false,
          points: question.points,
          earnedPoints: answer ? answer.points : 0
        };
      })
    };

    res.json(results);
  } catch (err) {
    console.error('Error getting quiz results:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get quiz attempt details for student quiz page
exports.getQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    // Get quiz attempt
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('unit', 'title')
      .populate('course', 'title');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    // Verify this attempt belongs to the current student
    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If already completed, return error
    if (attempt.completedAt) {
      return res.status(400).json({ 
        message: 'Quiz already completed',
        completed: true,
        attempt: {
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          passed: attempt.passed
        }
      });
    }

    // Return quiz data for student (without correct answers)
    const quizData = {
      attemptId: attempt._id,
      unitTitle: attempt.unit.title,
      courseTitle: attempt.course.title,
      timeLimit: 30, // 30 minutes
      questions: attempt.questions.map((q, index) => ({
        questionNumber: index + 1,
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      })),
      startedAt: attempt.startedAt
    };

    res.json(quizData);
  } catch (err) {
    console.error('Error getting quiz attempt:', err);
    res.status(500).json({ message: err.message });
  }
};
