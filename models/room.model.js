import { getCollections } from "../config/db.js";

const getRoomCollection = () => {
    const { roomsCollection } = getCollections();
    if (!roomsCollection) {
        throw new Error("Rooms collection is not initialized.");
    }
    return roomsCollection;
}

export const findRoomById = async (roomId) => {
  return await getRoomCollection().findOne({ roomId });
};

export const createRoom = async (newRoom) => {
  return await getRoomCollection().insertOne(newRoom);
};

// Update room with exam details (courseName, duration, etc.)
export const updateRoomExamDetails = async (roomId, examDetails) => {
  return await getRoomCollection().updateOne(
    { roomId },
    { 
      $set: {
        courseName: examDetails.courseName,
        examDuration: examDetails.examDuration, // in minutes
        examStartedAt: examDetails.examStartedAt || null,
        ...examDetails
      } 
    }
  );
};

// Get room with exam details
export const getRoomWithExamDetails = async (roomId) => {
  const room = await getRoomCollection().findOne(
    { roomId },
    { projection: { 
      roomId: 1, 
      courseName: 1, 
      examDuration: 1, 
      examStartedAt: 1,
      examDescription: 1,
      examSubject: 1,
      maxStudents: 1,
      proctoringLevel: 1,
      startTime: 1,
      createdAt: 1,
      questionPublicId: 1,
      questionFileName: 1
    } }
  );
  return room;
};

// Store Cloudinary public_id and resource_type in MongoDB (for secure, signed URLs)
export const updateRoomQuestion = async (roomId, publicId, fileName = 'question.pdf', resourceType = 'raw') => {
  return await getRoomCollection().updateOne(
    { roomId },
    { 
      $set: { 
        questionPublicId: publicId,
        questionResourceType: resourceType,
        questionFileName: fileName,
        questionUploadedAt: new Date()
      } 
    }
  );
};

// Get Cloudinary public_id and resource_type from MongoDB
export const getRoomQuestion = async (roomId) => {
  const room = await getRoomCollection().findOne(
    { roomId },
    { projection: { questionPublicId: 1, questionResourceType: 1, questionFileName: 1, questionUploadedAt: 1 } }
  );
  if (room?.questionPublicId) {
    return {
      public_id: room.questionPublicId,
      resource_type: room.questionResourceType || 'raw',
      fileName: room.questionFileName || 'question.pdf'
    };
  }
  return null;
};

