const ReadingMaterial = require('../models/ReadingMaterial');
const Unit = require('../models/Unit');
const Course = require('../models/Course');
const StudentProgress = require('../models/StudentProgress');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Create a new reading material
exports.createReadingMaterial = async (req, res) => {
  try {
    const { title, description, unitId, courseId, contentType, content, order } = req.body;
    let fileUrl = null;

    // Validate course and unit
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Handle file upload if PDF
    if (contentType === 'pdf' && req.file) {
      const { v4: uuidv4 } = await import('uuid');
      const uploadDir = path.join(__dirname, '..', 'uploads', 'materials');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filename = `${uuidv4()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      
      // Write file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Set fileUrl
      fileUrl = `/uploads/materials/${filename}`;
    }

    // Create reading material
    const readingMaterial = await ReadingMaterial.create({
      title,
      description,
      unit: unitId,
      course: courseId,
      contentType,
      content: contentType === 'text' ? content : null,
      fileUrl: contentType === 'pdf' ? fileUrl : null,
      order: order || 0
    });

    // Add to unit's reading materials array
    await Unit.findByIdAndUpdate(unitId, {
      $push: { readingMaterials: readingMaterial._id }
    });

    res.status(201).json(readingMaterial);
  } catch (err) {
    console.error('Error creating reading material:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update reading material
exports.updateReadingMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { title, description, contentType, content, order } = req.body;
    let fileUrl = null;

    const material = await ReadingMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Handle file upload if PDF
    if (contentType === 'pdf' && req.file) {
      const { v4: uuidv4 } = await import('uuid');
      const uploadDir = path.join(__dirname, '..', 'uploads', 'materials');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filename = `${uuidv4()}-${req.file.originalname}`;
      const filePath = path.join(uploadDir, filename);
      
      // Write file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Set fileUrl
      fileUrl = `/uploads/materials/${filename}`;
      
      // Delete old file if it exists
      const oldMaterial = await ReadingMaterial.findById(materialId);
      if (oldMaterial && oldMaterial.fileUrl) {
        const oldFilePath = path.join(__dirname, '..', 'uploads', 'materials', 
          path.basename(oldMaterial.fileUrl));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Update reading material
    const updateData = {
      title,
      description,
      contentType,
      order: order || material.order
    };

    if (contentType === 'text') {
      updateData.content = content;
      updateData.fileUrl = null;
    } else if (contentType === 'pdf' && fileUrl) {
      updateData.fileUrl = fileUrl;
      updateData.content = null;
    }

    const updatedMaterial = await ReadingMaterial.findByIdAndUpdate(
      materialId,
      updateData,
      { new: true }
    );

    res.json(updatedMaterial);
  } catch (err) {
    console.error('Error updating reading material:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete reading material
exports.deleteReadingMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;

    const material = await ReadingMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Remove from unit's reading materials array
    await Unit.findByIdAndUpdate(material.unit, {
      $pull: { readingMaterials: materialId }
    });

    // Delete file if it exists
    if (material.fileUrl) {
      const filePath = path.join(__dirname, '..', 'uploads', 'materials', 
        path.basename(material.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await ReadingMaterial.findByIdAndDelete(materialId);

    res.json({ message: 'Reading material deleted successfully' });
  } catch (err) {
    console.error('Error deleting reading material:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get single reading material
exports.getReadingMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await ReadingMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    // Check if student has completed this material
    let progress = await StudentProgress.findOne({
      student: req.user._id,
      course: material.course,
      'readingMaterials.material': materialId
    });

    const isCompleted = progress && 
      progress.readingMaterials.some(rm => 
        rm.material.toString() === materialId && rm.completed
      );

    res.json({
      ...material.toObject(),
      isCompleted
    });
  } catch (err) {
    console.error('Error getting reading material:', err);
    res.status(500).json({ message: err.message });
  }
};

// Mark reading material as completed
exports.markAsCompleted = async (req, res) => {
  try {
    const { materialId } = req.params;
    const studentId = req.user._id;

    const material = await ReadingMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Reading material not found' });
    }

    let progress = await StudentProgress.findOne({
      student: studentId,
      course: material.course
    });

    if (!progress) {
      // Create new progress record
      progress = new StudentProgress({
        student: studentId,
        course: material.course,
        readingMaterials: [{
          material: materialId,
          completed: true,
          completedAt: new Date()
        }]
      });
    } else {
      // Update existing progress
      const existingIndex = progress.readingMaterials.findIndex(
        rm => rm.material.toString() === materialId
      );

      if (existingIndex >= 0) {
        progress.readingMaterials[existingIndex].completed = true;
        progress.readingMaterials[existingIndex].completedAt = new Date();
      } else {
        progress.readingMaterials.push({
          material: materialId,
          completed: true,
          completedAt: new Date()
        });
      }
    }

    progress = await StudentProgress.findOneAndUpdate(
      { student: studentId, course: material.course },
      progress,
      { upsert: true, new: true }
    );

    res.json({ message: 'Reading material marked as completed', progress });
  } catch (err) {
    console.error('Error marking reading material as completed:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get reading materials for a unit
exports.getUnitReadingMaterials = async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const materials = await ReadingMaterial.find({ unit: unitId })
      .sort({ order: 1, createdAt: 1 });

    // Check completion status for each material if user is a student
    if (req.user.role === 'student') {
      const progress = await StudentProgress.findOne({
        student: req.user._id,
        course: materials.length > 0 ? materials[0].course : null
      });

      const materialsWithProgress = materials.map(material => {
        const isCompleted = progress && 
          progress.readingMaterials.some(rm => 
            rm.material.toString() === material._id.toString() && rm.completed
          );
        
        return {
          ...material.toObject(),
          isCompleted
        };
      });

      return res.json(materialsWithProgress);
    }

    res.json(materials);
  } catch (err) {
    console.error('Error getting unit reading materials:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get reading materials for a course
exports.getCourseReadingMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const materials = await ReadingMaterial.find({ course: courseId })
      .populate('unit', 'title order')
      .sort({ 'unit.order': 1, order: 1, createdAt: 1 });

    res.json(materials);
  } catch (err) {
    console.error('Error getting course reading materials:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get student's reading material progress
exports.getStudentReadingMaterialStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    const progress = await StudentProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.json({ readingMaterials: [] });
    }

    res.json({ readingMaterials: progress.readingMaterials });
  } catch (err) {
    console.error('Error getting student reading material status:', err);
    res.status(500).json({ message: err.message });
  }
};
