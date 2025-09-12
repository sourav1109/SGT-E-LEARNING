const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixDuplicateRegNos() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgt');
    console.log('Connected to MongoDB');

    // Find all students with duplicate regNos
    const duplicates = await User.aggregate([
      { $match: { role: 'student', regNo: { $exists: true, $ne: null } } },
      { $group: { _id: '$regNo', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`Found ${duplicates.length} duplicate registration numbers`);

    for (const duplicate of duplicates) {
      console.log(`\nFixing duplicate regNo: ${duplicate._id}`);
      const students = await User.find({ _id: { $in: duplicate.docs } }).sort({ createdAt: 1 });
      
      // Keep the first student with the original regNo, update others
      for (let i = 1; i < students.length; i++) {
        const student = students[i];
        
        // Generate new unique regNo with retry logic
        let newRegNo;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
          // Find the highest existing regNo
          const highestStudent = await User.findOne(
            { regNo: { $regex: /^S\d{6}$/ } },
            { regNo: 1 },
            { sort: { regNo: -1 } }
          );
          
          let nextNumber = 1000000; // Start from a high number to avoid conflicts
          if (highestStudent && highestStudent.regNo) {
            const currentNumber = parseInt(highestStudent.regNo.substring(1), 10);
            nextNumber = Math.max(currentNumber + 1, 1000000);
          }
          
          // Generate new regNo
          newRegNo = 'S' + nextNumber.toString().padStart(6, '0');
          
          // Check if this regNo already exists
          const existingStudent = await User.findOne({ regNo: newRegNo });
          if (!existingStudent) {
            break; // Found a unique regNo
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.log(`Failed to generate unique regNo for student ${student.name}`);
          continue;
        }
        
        // Update the student
        await User.findByIdAndUpdate(student._id, { regNo: newRegNo });
        console.log(`Updated student ${student.name} from ${duplicate._id} to ${newRegNo}`);
      }
    }

    // Create unique index on regNo
    try {
      await User.collection.createIndex({ regNo: 1 }, { unique: true, sparse: true });
      console.log('\nCreated unique index on regNo field');
    } catch (indexError) {
      console.log('Index might already exist:', indexError.message);
    }

    console.log('\nDuplicate registration numbers fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing duplicate regNos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixDuplicateRegNos();
