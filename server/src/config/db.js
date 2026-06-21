const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = connectDB;
