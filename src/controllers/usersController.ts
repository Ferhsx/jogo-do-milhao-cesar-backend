import { Request, Response } from 'express';
import db from '../repositories/connectionDB';
import { User, LoginCredentials } from '../models/userStructure';
import { secureHash, verifyPassword } from '../middlewares/securePassword';
import jwt from 'jsonwebtoken';

const jwtSecret = String(process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not defined.');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,128}$/;

class UsersController {
    
    constructor() {}

    public addUser = async (req: Request, res: Response) => {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password || !role) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            if (!EMAIL_REGEX.test(email)) {
                return res.status(400).json({ message: 'Invalid email format.' });
            }

            if (!PASS_REGEX.test(password)) {
                return res.status(400).json({
                    message: 'Password must be 8-128 chars, include uppercase, lowercase, number and special char.'
                });
            }

            if (role === 'admin') {
                return res.status(403).json({ message: 'Cannot create admin users through this endpoint.' });
            }

            if (!db) {
                console.error('Database connection failed.');
                return res.status(503).json({ message: 'Service unavailable.' });
            }

            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: 'User with this email already exists.' });
            }

            const hashedPassword = await secureHash(password);

            const newUser: User = {
                name,
                email,
                password: hashedPassword,
                role,
                createdAt: new Date(),
                isBlocked: false
            };

            const result = await db.collection('users').insertOne(newUser);

            return res.status(201).json({
                message: 'User created successfully.',
                userId: result.insertedId
            });

        } catch (error) {
            console.error('Error adding user:', error);
            return res.status(500).json({ message: 'Internal server error.' });
        }
    }

    public loginUser = async (req: Request, res: Response) => {
        const { email, password }: LoginCredentials = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            if (!db) {
                return res.status(503).json({ message: 'Service unavailable.' });
            }

            const user = await db.collection('users').findOne({ email });

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const passwordMatch = await verifyPassword(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            const token = jwt.sign(
                { userId: user._id, role: user.role }, 
                jwtSecret, 
                { expiresIn: '1h' }
            );
            
            return res.status(200).json({ message: 'Login successful.', token });

        } catch (error) {
            console.error('Error logging in user:', error);
            return res.status(500).json({ message: 'Internal server error.' });
        }
    }
}

export default new UsersController();