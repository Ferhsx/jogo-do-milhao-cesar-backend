// Default imports
import { MongoClient } from 'mongodb';

// Environment variables
import 'dotenv/config';

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB;

const client = new MongoClient(uri || 'mongodb://localhost:27017/');
const db = client.db(dbName || 'bancoTeste');

try {
    
    await client.connect();
    console.log('Connected to MongoDB');
    
} catch (error) {

    console.error('Error connecting to MongoDB:', error);

}

export default db;