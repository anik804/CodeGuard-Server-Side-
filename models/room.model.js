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

// Store Cloudinary URL in MongoDB
export const updateRoomQuestion = async (roomId, cloudinaryUrl, fileName = 'question.pdf') => {
  return await getRoomCollection().updateOne(
    { roomId },
    { 
      $set: { 
        questionPdfUrl: cloudinaryUrl,
        questionFileName: fileName,
        questionUploadedAt: new Date()
      } 
    }
  );
};

// Get Cloudinary URL from MongoDB
export const getRoomQuestion = async (roomId) => {
  const room = await getRoomCollection().findOne(
    { roomId },
    { projection: { questionPdfUrl: 1, questionFileName: 1, questionUploadedAt: 1 } }
  );
  if (room?.questionPdfUrl) {
    return {
      url: room.questionPdfUrl,
      fileName: room.questionFileName || 'question.pdf'
    };
  }
  return null;
};

