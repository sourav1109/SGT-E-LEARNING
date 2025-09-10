const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const QuizPool = require('../models/QuizPool');
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const StudentProgress = require('../models/StudentProgress');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

// Helper function to shuffle an array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Create quiz template file
exports.createQuizTemplate = (req, res) => {
  // Create CSV template for quiz questions
  const template = [
    'questionText,option1,option2,option3,option4,correctOption,points',
    'What is the capital of France?,London,Paris,Berlin,Madrid,2,1',
    'Which planet is known as the Red Planet?,Earth,Venus,Mars,Jupiter,3,1',
    'Add your questions following this format. The correctOption number is 1-based (1,2,3,4).,,,,,,'
  ].join('\n');
  
  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=quiz_template.csv');
  
  // Send the template file
  res.send(template);
};

// Upload quiz via CSV
exports.uploadQuiz = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { title, description, courseId, videoId, afterVideoId, unitId, timeLimit, passingScore } = req.body;
    
    // Validate required fields
    if (!title || !courseId) {
      return res.status(400).json({ message: 'Title and course ID are required' });
    }
    
    // Either videoId or unitId must be provided
    if (!videoId && !unitId) {
      return res.status(400).json({ message: 'Either video ID or unit ID is required' });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // If videoId is provided, validate it
    if (videoId) {
      // Check if video exists and belongs to the course
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      if (video.course.toString() !== courseId) {
        return res.status(400).json({ message: 'Video does not belong to the specified course' });
      }
    }
    
    // If unitId is provided, validate it
    let unit = null;
    if (unitId) {
      unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      
      if (unit.course.toString() !== courseId) {
        return res.status(400).json({ message: 'Unit does not belong to the specified course' });
      }
    }
    
    // Parse CSV file
    const questions = [];
    let rowCount = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Skip empty rows and example rows
          if (!row.questionText || row.questionText.includes('Add your questions')) {
            return;
          }
          
          rowCount++;
          
          // Validate row data
          const options = [row.option1, row.option2, row.option3, row.option4];
          const correctOption = parseInt(row.correctOption) - 1; // Convert to 0-based index
          const points = parseInt(row.points) || 1;
          
          // Validate options
          if (options.some(opt => !opt || opt.trim() === '')) {
            reject(new Error(`Row ${rowCount}: All four options must be provided`));
            return;
          }
          
          // Validate correct option
          if (isNaN(correctOption) || correctOption < 0 || correctOption > 3) {
            reject(new Error(`Row ${rowCount}: Correct option must be a number between 1 and 4`));
            return;
          }
          
          questions.push({
            questionText: row.questionText,
            options,
            correctOption,
            points
          });
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
    
    // Validate minimum number of questions
    if (questions.length < 3) {
      return res.status(400).json({ message: 'Quiz must have at least 3 questions' });
    }
    
    // Create new quiz
    const quiz = new Quiz({
      title,
      description,
      course: courseId,
      unit: unitId || undefined,
      video: videoId || undefined,
      afterVideo: afterVideoId || undefined,
      questions,
      timeLimit: parseInt(timeLimit) || 30,
      passingScore: 70, // Fixed at 70% as per requirements
      unlockNextVideo: true,
      createdBy: req.user._id
    });
    
    await quiz.save();
    
    // If this quiz is after a specific video, update that video
    if (afterVideoId) {
      await Video.findByIdAndUpdate(afterVideoId, {
        $set: { hasQuizAfter: true, quiz: quiz._id }
      });
    }
    
    // Handle quiz pool integration
    if (unitId) {
      // First, find or create a quiz pool for this unit
      let quizPool = await QuizPool.findOne({ 
        unit: unitId,
        course: courseId
      });
      
      if (!quizPool) {
        // Create a new quiz pool
        quizPool = new QuizPool({
          title: `${unit.title} Quiz Pool`,
          description: `Quiz pool for ${unit.title}`,
          course: courseId,
          unit: unitId,
          questionsPerAttempt: 10, // As per requirements, each student gets 10 questions
          timeLimit: parseInt(timeLimit) || 30,
          passingScore: 70, // Fixed at 70% as per requirements
          unlockNextVideo: true,
          createdBy: req.user._id,
          contributors: [req.user._id]
        });
        
        await quizPool.save();
        
        // Update unit with quiz pool
        await Unit.findByIdAndUpdate(unitId, {
          $set: { quizPool: quizPool._id }
        });
      } else {
        // Add current teacher to contributors if not already there
        if (!quizPool.contributors.includes(req.user._id)) {
          quizPool.contributors.push(req.user._id);
          await quizPool.save();
        }
      }
      
      // Add the quiz to the pool
      quizPool.quizzes.push(quiz._id);
      await quizPool.save();
      
      // Also add quiz to unit for backward compatibility
      await Unit.findByIdAndUpdate(unitId, {
        $addToSet: { quizzes: quiz._id }
      });
    }
    
    // Log the action
    await AuditLog.create({
      action: 'create_quiz',
      performedBy: req.user._id,
      details: { 
        quizId: quiz._id, 
        title, 
        courseId, 
        videoId, 
        afterVideoId,
        unitId,
        questionCount: questions.length 
      }
    });
    
    // Clean up - remove the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      message: 'Quiz created successfully and added to the unit quiz pool',
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints
      }
    });
    
  } catch (error) {
    console.error('Error uploading quiz:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: error.message });
  }
};

// Get quizzes for a course
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get all quizzes for this course
    const quizzes = await Quiz.find({ course: courseId, isActive: true })
      .select('_id title description video unit totalPoints timeLimit createdAt createdBy questions')
      .populate('video', 'title thumbnail')
      .populate('unit', 'title')
      .populate('createdBy', 'name');
    
    // Get quiz pools for this course
    const quizPools = await QuizPool.find({ 
      course: courseId, 
      isActive: true,
      unit: { $exists: true, $ne: null }  // Only get quiz pools with valid units
    })
      .select('_id title description unit quizzes createdAt')
      .populate('unit', 'title');
    
    // Add question counts for all quiz pools
    const enhancedQuizPools = await Promise.all(quizPools.map(async (pool) => {
      // Get all quizzes in this pool
      const poolQuizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
      
      // Count total questions across all quizzes
      let questionCount = 0;
      poolQuizzes.forEach(quiz => {
        questionCount += quiz.questions ? quiz.questions.length : 0;
      });
      
      const poolObj = pool.toObject();
      poolObj.questionCount = questionCount;
      return poolObj;
    }));
    
    // Process quizzes to include question count and exclude the actual questions
    const processedQuizzes = quizzes.map(quiz => {
      const quizObj = quiz.toObject();
      quizObj.questionCount = quiz.questions.length;
      delete quizObj.questions; // Remove the questions array to reduce payload size
      return quizObj;
    });
    
    // Combine both for a complete view
    const response = {
      quizzes: processedQuizzes,
      quizPools: enhancedQuizPools
    };
      
    res.json(response);
  } catch (error) {
    console.error('Error getting course quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get full quiz details with questions & student attempts (admin/teacher)
exports.getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;

    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }

    // Authorization: only teacher or admin
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // If teacher, ensure assigned to course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      if (!teacher.coursesAssigned.includes(quiz.course._id.toString())) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }

    // Fetch attempts that directly reference this quiz (rare if using quiz pools)
    const attempts = await QuizAttempt.find({ quiz: quizId })
      .populate('student', 'name regNo email')
      .sort({ completedAt: -1 });

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course,
        unit: quiz.unit,
        createdBy: quiz.createdBy,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints,
        createdAt: quiz.createdAt
      },
      questions: quiz.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        points: q.points
      })),
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting quiz details:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get unit quiz pool for students
exports.getUnitQuizForStudent = async (req, res) => {
  try {
    const { unitId } = req.params;
    
    // Validate unitId
    if (!isValidObjectId(unitId)) {
      return res.status(400).json({ message: 'Invalid unit ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can take quizzes' });
    }
    
    // Get the unit
    const Unit = require('../models/Unit');
    const unit = await Unit.findById(unitId)
      .populate('course', 'title')
      .populate('videos');
    
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id).select('coursesAssigned');
    if (!student.coursesAssigned.includes(unit.course._id.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Check if the student has watched all videos in the unit
    const studentProgress = await StudentProgress.findOne({
      student: req.user._id,
      course: unit.course._id,
      'units.unitId': unitId
    });
    
    let canTakeQuiz = false;
    if (studentProgress) {
      const unitProgress = studentProgress.units.find(u => u.unitId.toString() === unitId);
      if (unitProgress) {
        // Check if all videos are watched
        const watchedVideos = unitProgress.videosWatched || [];
        const unitVideos = unit.videos || [];
        
        if (unitVideos.length === 0 || watchedVideos.length >= unitVideos.length) {
          canTakeQuiz = true;
        }
      }
    }
    
    if (!canTakeQuiz) {
      return res.status(403).json({ 
        message: 'You need to watch all videos in this unit before taking the quiz',
        videosRequired: true
      });
    }
    
    // Get the quiz pool for this unit
    const quizPool = await QuizPool.findOne({ unit: unitId, isActive: true })
      .select('_id title description questionsPerAttempt timeLimit passingScore');
    
    if (!quizPool) {
      return res.status(404).json({ message: 'No quiz available for this unit' });
    }
    
    // Check if student has already attempted and passed the quiz
    const existingAttempt = await QuizAttempt.findOne({
      quizPool: quizPool._id,
      student: req.user._id,
      passed: true
    });
    
    if (existingAttempt) {
      return res.json({
        quizPool: {
          _id: quizPool._id,
          title: quizPool.title,
          description: quizPool.description,
          timeLimit: quizPool.timeLimit
        },
        attempt: {
          _id: existingAttempt._id,
          score: existingAttempt.score,
          percentage: existingAttempt.percentage,
          passed: existingAttempt.passed,
          completedAt: existingAttempt.completedAt
        },
        alreadyPassed: true
      });
    }
    
    // Check for recent failed attempts (8-hour cooldown)
    const lastFailedAttempt = await QuizAttempt.findOne({
      quizPool: quizPool._id,
      student: req.user._id,
      passed: false
    }).sort({ completedAt: -1 });
    
    if (lastFailedAttempt) {
      const now = new Date();
      const lastAttemptTime = new Date(lastFailedAttempt.completedAt);
      const hoursSinceLastAttempt = (now - lastAttemptTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastAttempt < 8) {
        const hoursRemaining = Math.ceil(8 - hoursSinceLastAttempt);
        
        return res.status(403).json({
          message: `You can retry this quiz in ${hoursRemaining} hour(s)`,
          cooldownRemaining: hoursRemaining,
          lastAttempt: {
            _id: lastFailedAttempt._id,
            score: lastFailedAttempt.score,
            percentage: lastFailedAttempt.percentage,
            completedAt: lastFailedAttempt.completedAt
          }
        });
      }
    }
    
    // Get all quizzes in the pool
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    
    if (quizzes.length === 0) {
      return res.status(404).json({ message: 'No questions available in the quiz pool' });
    }
    
    // Collect all questions from all quizzes
    const allQuestions = [];
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        allQuestions.push({
          _id: question._id,
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          points: question.points,
          originalQuizId: quiz._id
        });
      });
    });
    
    // Shuffle and select questionsPerAttempt questions (default 10)
    const questionsToSelect = Math.min(quizPool.questionsPerAttempt, allQuestions.length);
    const selectedQuestions = shuffleArray([...allQuestions])
      .slice(0, questionsToSelect);
    
    // Prepare quiz for student (remove correct answers)
    const quizForStudent = {
      _id: quizPool._id,
      title: quizPool.title || `${unit.title} Quiz`,
      description: quizPool.description || `Complete this quiz to progress in the course`,
      timeLimit: quizPool.timeLimit || 30,
      questionsCount: selectedQuestions.length,
      passingScore: quizPool.passingScore || 70,
      questions: selectedQuestions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        points: q.points
      }))
    };
    
    res.json({
      quizPool: quizForStudent,
      unitTitle: unit.title,
      courseTitle: unit.course.title,
      alreadyPassed: false
    });
  } catch (error) {
    console.error('Error getting unit quiz for student:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit quiz pool attempt
exports.submitQuizPoolAttempt = async (req, res) => {
  try {
    const { quizPoolId } = req.params;
    const { answers, timeSpent } = req.body;
    
    // Validate quizPoolId
    if (!isValidObjectId(quizPoolId)) {
      return res.status(400).json({ message: 'Invalid quiz pool ID format' });
    }
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit quizzes' });
    }
    
    // Get quiz pool details
    const quizPool = await QuizPool.findById(quizPoolId);
    if (!quizPool) {
      return res.status(404).json({ message: 'Quiz pool not found' });
    }
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id).select('coursesAssigned');
    if (!student.coursesAssigned.includes(quizPool.course.toString())) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }
    
    // Validate answers
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers format' });
    }
    
    // Get all quizzes in the pool to find original questions
    const quizzes = await Quiz.find({ _id: { $in: quizPool.quizzes } });
    
    // Create a map of all questions from all quizzes for faster lookup
    const allQuestionsMap = {};
    quizzes.forEach(quiz => {
      quiz.questions.forEach(question => {
        allQuestionsMap[question._id.toString()] = {
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          points: question.points,
          originalQuizId: quiz._id
        };
      });
    });
    
    // Process answers and calculate score
    let score = 0;
    let maxScore = 0;
    const processedAnswers = [];
    const attemptQuestions = [];
    
    // Process each answer
    answers.forEach(answer => {
      const questionId = answer.questionId;
      const question = allQuestionsMap[questionId];
      
      if (!question) {
        return; // Skip if question not found
      }
      
      const isCorrect = answer.selectedOption === question.correctOption;
      const points = isCorrect ? question.points : 0;
      score += points;
      maxScore += question.points;
      
      processedAnswers.push({
        questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        points
      });
      
      // Store question in the attempt
      attemptQuestions.push({
        questionId,
        questionText: question.questionText,
        options: question.options,
        correctOption: question.correctOption,
        points: question.points,
        originalQuizId: question.originalQuizId
      });
    });
    
    // Calculate percentage and pass status
    const percentage = (score / maxScore) * 100;
    const passed = percentage >= quizPool.passingScore;
    
    // Create quiz attempt record
    const attempt = new QuizAttempt({
      quizPool: quizPoolId,
      student: req.user._id,
      course: quizPool.course,
      unit: quizPool.unit,
      questions: attemptQuestions,
      answers: processedAnswers,
      score,
      maxScore,
      percentage,
      passed,
      timeSpent: timeSpent || 0,
      completedAt: new Date()
    });
    
    await attempt.save();
    
    // Log the action
    await AuditLog.create({
      action: 'submit_quiz_pool',
      performedBy: req.user._id,
      details: { quizPoolId, score, percentage, passed }
    });
    
    // Update student progress
    if (quizPool.unit) {
      // Find or create progress record
      let progress = await StudentProgress.findOne({
        student: req.user._id,
        course: quizPool.course
      });
      
      if (!progress) {
        // Create new progress record
        progress = new StudentProgress({
          student: req.user._id,
          course: quizPool.course,
          units: [{
            unitId: quizPool.unit,
            status: passed ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: quizPoolId,
              attemptId: attempt._id,
              score: percentage,
              passed,
              completedAt: new Date()
            }]
          }],
          lastActivity: new Date()
        });
      } else {
        // Find the unit in the progress
        const unitIndex = progress.units.findIndex(u => 
          u.unitId.toString() === quizPool.unit.toString()
        );
        
        if (unitIndex >= 0) {
          // Update existing unit progress
          const unitProgress = progress.units[unitIndex];
          
          // Add quiz attempt
          unitProgress.quizAttempts.push({
            quizId: quizPoolId,
            attemptId: attempt._id,
            score: percentage,
            passed,
            completedAt: new Date()
          });
          
          // Update unit status if passed
          if (passed) {
            unitProgress.status = 'completed';
            unitProgress.completedAt = new Date();
          }
          
          progress.units[unitIndex] = unitProgress;
        } else {
          // Add new unit progress
          progress.units.push({
            unitId: quizPool.unit,
            status: passed ? 'completed' : 'in-progress',
            quizAttempts: [{
              quizId: quizPoolId,
              attemptId: attempt._id,
              score: percentage,
              passed,
              completedAt: new Date()
            }]
          });
        }
        
        progress.lastActivity = new Date();
      }
      
      await progress.save();
      
      // If passed, unlock next unit
      if (passed) {
        // Get the current unit's order
        const Unit = require('../models/Unit');
        const currentUnit = await Unit.findById(quizPool.unit);
        
        if (currentUnit) {
          // Find the next unit in sequence
          const nextUnit = await Unit.findOne({
            course: quizPool.course,
            order: { $gt: currentUnit.order }
          }).sort({ order: 1 });
          
          if (nextUnit) {
            // Check if the student already has this unit in progress
            const hasNextUnit = progress.units.some(u => 
              u.unitId.toString() === nextUnit._id.toString()
            );
            
            if (!hasNextUnit) {
              // Add the next unit as unlocked
              progress.units.push({
                unitId: nextUnit._id,
                status: 'in-progress',
                unlocked: true,
                unlockedAt: new Date()
              });
              
              await progress.save();
            }
          }
        }
      }
    }

    res.json({
      message: passed ? 'Congratulations! You passed the quiz.' : 'Quiz submitted successfully.',
      result: {
        score,
        maxScore,
        percentage,
        passed,
        answers: processedAnswers
      }
    });
  } catch (error) {
    console.error('Error submitting quiz pool attempt:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get quiz analytics for teachers
exports.getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Validate quizId
    if (!isValidObjectId(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID format' });
    }
    
    // Check if user is authorized (teacher or admin)
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get quiz details
    const quiz = await Quiz.findById(quizId)
      .populate('course', 'title')
      .populate('video', 'title')
      .populate('createdBy', 'name');
      
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // If user is a teacher, check if they are assigned to the course
    if (req.user.role === 'teacher') {
      const teacher = await User.findById(req.user._id).select('coursesAssigned');
      if (!teacher.coursesAssigned.includes(quiz.course._id)) {
        return res.status(403).json({ message: 'You are not assigned to this course' });
      }
    }
    
    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quiz: quizId })
      .populate('student', 'name regNo');
    
    // Calculate analytics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts 
      : 0;
    
    // Calculate per-question analytics
    const questionAnalytics = {};
    quiz.questions.forEach(q => {
      questionAnalytics[q._id] = {
        questionText: q.questionText,
        correctCount: 0,
        incorrectCount: 0,
        accuracy: 0
      };
    });
    
    attempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        const qId = answer.questionId.toString();
        if (questionAnalytics[qId]) {
          if (answer.isCorrect) {
            questionAnalytics[qId].correctCount++;
          } else {
            questionAnalytics[qId].incorrectCount++;
          }
        }
      });
    });
    
    // Calculate accuracy for each question
    Object.keys(questionAnalytics).forEach(qId => {
      const q = questionAnalytics[qId];
      const total = q.correctCount + q.incorrectCount;
      q.accuracy = total > 0 ? (q.correctCount / total) * 100 : 0;
    });
    
    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course,
        video: quiz.video,
        createdBy: quiz.createdBy,
        questionCount: quiz.questions.length,
        totalPoints: quiz.totalPoints,
        passingScore: quiz.passingScore,
        createdAt: quiz.createdAt
      },
      analytics: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate,
        averageScore,
        questionAnalytics: Object.values(questionAnalytics)
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        student: a.student,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting quiz analytics:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz pools for teacher
exports.getTeacherQuizPools = async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access quiz pools' });
    }
    
    // Get all quiz pools for courses assigned to this teacher
    const teacher = await User.findById(req.user._id).select('coursesAssigned');
    
    const quizPools = await QuizPool.find({
      course: { $in: teacher.coursesAssigned },
      isActive: true
    })
    .populate('course', 'title courseCode')
    .populate('unit', 'title')
    .populate('contributors', 'name');
    
    // Get statistics for each quiz pool
    const poolsWithStats = await Promise.all(quizPools.map(async (pool) => {
      // Count quizzes contributed by this teacher
      const teacherQuizzes = await Quiz.countDocuments({
        _id: { $in: pool.quizzes },
        createdBy: req.user._id
      });
      
      // Count total questions in the pool
      let totalQuestions = 0;
      const quizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
      quizzes.forEach(quiz => {
        totalQuestions += quiz.questions.length;
      });
      
      // Count student attempts
      const attempts = await QuizAttempt.countDocuments({ quizPool: pool._id });
      const passedAttempts = await QuizAttempt.countDocuments({ 
        quizPool: pool._id,
        passed: true
      });
      
      return {
        _id: pool._id,
        title: pool.title,
        course: pool.course,
        unit: pool.unit,
        quizzesCount: pool.quizzes.length,
        teacherContributions: teacherQuizzes,
        totalQuestions,
        attempts,
        passedAttempts,
        contributors: pool.contributors
      };
    }));
    
    res.json(poolsWithStats);
  } catch (error) {
    console.error('Error getting teacher quiz pools:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get student quiz results
exports.getStudentQuizResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Ensure the user has permission to view these results
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (req.user.role === 'teacher') {
      // Teachers can only view results for students in their courses
      const teacherCourses = await User.findById(req.user._id).select('coursesAssigned');
      const student = await User.findById(studentId).select('coursesAssigned');
      
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      
      // Check if teacher and student share any courses
      const sharedCourses = teacherCourses.coursesAssigned.filter(c => 
        student.coursesAssigned.some(sc => sc.toString() === c.toString())
      );
      
      if (sharedCourses.length === 0) {
        return res.status(403).json({ message: 'You can only view results for students in your courses' });
      }
    }
    
    // Get all quiz attempts for this student
    const attempts = await QuizAttempt.find({ student: studentId })
      .populate({
        path: 'quiz',
        select: 'title'
      })
      .populate({
        path: 'quizPool',
        select: 'title'
      })
      .populate('course', 'title courseCode')
      .populate('unit', 'title')
      .sort({ completedAt: -1 });
    
    // Calculate overall statistics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts 
      : 0;
    
    res.json({
      statistics: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        averageScore
      },
      attempts: attempts.map(a => ({
        _id: a._id,
        quiz: a.quiz,
        quizPool: a.quizPool,
        course: a.course,
        unit: a.unit,
        score: a.score,
        maxScore: a.maxScore,
        percentage: a.percentage,
        passed: a.passed,
        completedAt: a.completedAt
      }))
    });
  } catch (error) {
    console.error('Error getting student quiz results:', error);
    res.status(500).json({ message: error.message });
  }
};
