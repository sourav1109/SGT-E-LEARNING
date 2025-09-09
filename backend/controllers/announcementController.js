const Announcement = require('../models/Announcement');
const User = require('../models/User');

// Get announcements based on user role
exports.getAnnouncements = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    let announcements = [];

    if (userRole === 'admin' || userRole === 'superadmin') {
      // Admins see all announcements
      announcements = await Announcement.find()
        .sort({ createdAt: -1 })
        .populate('sender', 'name email role teacherId')
        .populate('course', 'title courseCode')
        .populate('lastEditedBy', 'name email role')
        .populate('editHistory.editedBy', 'name email role');
    } else if (userRole === 'teacher') {
      // Teachers see announcements where they are recipients or sender
      // Teachers should not see announcements for students only
      announcements = await Announcement.find({
        $or: [
          { sender: userId },
          { recipients: 'teacher' }
        ]
      })
        .sort({ createdAt: -1 })
        .populate('sender', 'name email role teacherId')
        .populate('course', 'title courseCode')
        .populate('lastEditedBy', 'name email role');
    } else if (userRole === 'student') {
      // Students see announcements where they are recipients or for their courses
      const student = await User.findById(userId);
      const studentCourses = student.coursesAssigned || [];
      
      announcements = await Announcement.find({
        $or: [
          { recipients: 'student' },
          { 
            role: 'teacher', 
            course: { $in: studentCourses } 
          }
        ]
      })
        .sort({ createdAt: -1 })
        .populate('sender', 'name email role teacherId')
        .populate('course', 'title courseCode')
        .populate('lastEditedBy', 'name email role');
    }

    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get edit history for a specific announcement
exports.getAnnouncementHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admin users can see edit history
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to view edit history' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email role teacherId')
      .populate('lastEditedBy', 'name email role')
      .populate('editHistory.editedBy', 'name email role');
      
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({
      announcement,
      history: announcement.editHistory || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get edit history for a specific announcement
exports.getAnnouncementHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    
    // Only admins can view edit history
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to view edit history' });
    }
    
    const announcement = await Announcement.findById(id)
      .populate('sender', 'name email role teacherId')
      .populate('lastEditedBy', 'name email role')
      .populate('editHistory.editedBy', 'name email role');
      
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Return the announcement with its edit history
    res.json({
      announcement,
      history: announcement.editHistory || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
