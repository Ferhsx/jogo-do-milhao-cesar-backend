import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'secret_dev_key';

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(403).json({ message: "Token não fornecido." });
    }

    try {

        const decoded = jwt.verify(token, jwtSecret);
        (req as any).user = decoded;
        next();

    } catch (err) {

        return res.status(401).json({ message: "Token inválido." });

    }
};