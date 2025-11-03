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

export const updateRoomQuestion = async (roomId, questionUrl) => {
  return await getRoomCollection().updateOne(
    { roomId },
    { 
      $set: { 
        questionPdfUrl: questionUrl,
        questionUploadedAt: new Date()
      } 
    }
  );
};

export const getRoomQuestion = async (roomId) => {
  const room = await getRoomCollection().findOne(
    { roomId },
    { projection: { questionPdfUrl: 1, questionUploadedAt: 1 } }
  );
  return room?.questionPdfUrl || null;
};

