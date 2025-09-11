const CourseChatMessage = require('../models/CourseChatMessage');
const Course = require('../models/Course');

// Get all chat messages for a course
exports.getCourseChat = async (req, res) => {
  try {
    const { courseId } = req.params;
    // Check if user is enrolled in or teaching this course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const userId = req.user._id.toString();
    const isTeacher = course.teachers.map(t => t.toString()).includes(userId);
    let isStudent = course.students ? course.students.map(s => s.toString()).includes(userId) : false;
    let isAdmin = req.user.role === 'admin';
    if (!isStudent) {
      // Check if user has this course in their coursesAssigned
      const User = require('../models/User');
      const userDoc = await User.findById(userId);
      if (userDoc && userDoc.coursesAssigned && userDoc.coursesAssigned.map(cid => cid.toString()).includes(courseId)) {
        isStudent = true;
      }
    }
    if (!isTeacher && !isStudent && !isAdmin) return res.status(403).json({ message: 'Not authorized' });
    const messages = await CourseChatMessage.find({ course: courseId })
      .populate('user', 'name role')
      .sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching chat messages' });
  }
};

// Post a new chat message to a course
exports.postCourseChat = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Message content required' });
    // Check if user is enrolled in or teaching this course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const userId = req.user._id.toString();
    const isTeacher = course.teachers.map(t => t.toString()).includes(userId);
    let isStudent = course.students ? course.students.map(s => s.toString()).includes(userId) : false;
    let isAdmin = req.user.role === 'admin';
    if (!isStudent) {
      // Check if user has this course in their coursesAssigned
      const User = require('../models/User');
      const userDoc = await User.findById(userId);
      if (userDoc && userDoc.coursesAssigned && userDoc.coursesAssigned.map(cid => cid.toString()).includes(courseId)) {
        isStudent = true;
      }
    }
    if (!isTeacher && !isStudent && !isAdmin) return res.status(403).json({ message: 'Not authorized' });
    const message = await CourseChatMessage.create({
      course: courseId,
      user: req.user._id,
      content
    });
    await message.populate('user', 'name role');
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: 'Error posting chat message' });
  }
};
