import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/quizGame';

const connectDB = async () => {
    try {
        await mongoose.connect(uri);
    } catch (error) {
        process.exit(1);
    }
};

export default connectDB;