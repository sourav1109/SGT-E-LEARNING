const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function manualFixDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgt');
    console.log('Connected to MongoDB');

    // Find all students with S1000000 (the most problematic one)
    const duplicateStudents = await User.find({ regNo: 'S1000000', role: 'student' }).sort({ _id: 1 });
    
    console.log(`Found ${duplicateStudents.length} students with regNo S1000000`);
    
    // Assign new unique registration numbers starting from S1000005
    let nextNumber = 1000005;
    
    for (let i = 1; i < duplicateStudents.length; i++) { // Keep the first one, change others
      const student = duplicateStudents[i];
      
      // Find a unique regNo
      let newRegNo;
      let attempts = 0;
      
      while (attempts < 50) {
        newRegNo = 'S' + nextNumber.toString().padStart(6, '0');
        
        const existing = await User.findOne({ regNo: newRegNo });
        if (!existing) {
          break;
        }
        nextNumber++;
        attempts++;
      }
      
      if (attempts >= 50) {
        console.log(`Failed to find unique regNo for ${student.name}`);
        continue;
      }
      
      await User.findByIdAndUpdate(student._id, { regNo: newRegNo });
      console.log(`Updated ${student.name} (${student.email}) from S1000000 to ${newRegNo}`);
      nextNumber++;
    }

    // Now fix any remaining duplicates by finding all duplicates
    const allDuplicates = await User.aggregate([
      { $match: { role: 'student', regNo: { $exists: true, $ne: null } } },
      { $group: { _id: '$regNo', count: { $sum: 1 }, docs: { $push: { id: '$_id', name: '$name', email: '$email' } } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`\nRemaining duplicates: ${allDuplicates.length}`);
    
    for (const duplicate of allDuplicates) {
      console.log(`\nFixing remaining duplicate regNo: ${duplicate._id}`);
      
      // Keep the first student, update others
      for (let i = 1; i < duplicate.docs.length; i++) {
        const student = duplicate.docs[i];
        
        // Find a unique regNo
        let newRegNo;
        let attempts = 0;
        
        while (attempts < 50) {
          newRegNo = 'S' + nextNumber.toString().padStart(6, '0');
          
          const existing = await User.findOne({ regNo: newRegNo });
          if (!existing) {
            break;
          }
          nextNumber++;
          attempts++;
        }
        
        if (attempts >= 50) {
          console.log(`Failed to find unique regNo for ${student.name}`);
          continue;
        }
        
        await User.findByIdAndUpdate(student.id, { regNo: newRegNo });
        console.log(`Updated ${student.name} (${student.email}) from ${duplicate._id} to ${newRegNo}`);
        nextNumber++;
      }
    }

    console.log('\nDuplicate fix completed!');
    
  } catch (error) {
    console.error('Error fixing duplicates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

manualFixDuplicates();
