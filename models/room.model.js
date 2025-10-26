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

