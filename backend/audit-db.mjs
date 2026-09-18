import mongoose from "mongoose";
await mongoose.connect("mongodb://127.0.0.1:27017/rakshasafe");
const collections = await mongoose.connection.db.listCollections().toArray();
console.log("Collections:");
collections.forEach(c => console.log(" -", c.name));
await mongoose.disconnect();