import { Request, Response } from 'express';
import User, { IUser } from '../models/userStructure';
import { secureHash, verifyPassword } from '../middlewares/securePassword';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'secret_dev_key';

class UsersController {

    // Login
    public loginUser = async (req: Request, res: Response) => {
        const { email, password } = req.body;

        try {

            const user = await User.findOne({ email });
            if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

            const match = await verifyPassword(password, user.password);
            if (!match) return res.status(401).json({ message: 'Credenciais inválidas.' });

            const token = jwt.sign(
                { id: user._id, role: user.role, name: user.username },
                jwtSecret,
                { expiresIn: '8h' }
            );

            return res.status(200).json({ token, user: { name: user.username, email: user.email } });

        } catch (error) {

            return res.status(500).json({ message: 'Erro no servidor' });

        }
    }

    // Register (Apenas admins podem criar admins via API ou rota inicial)
    public addUser = async (req: Request, res: Response) => {
        try {
            const { name, email, password } = req.body;

            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ message: "Email já cadastrado." });

            const hashedPassword = await secureHash(password);

            const newUser = await User.create({
                username: name,
                email,
                password: hashedPassword,
                role: 'admin'
            });

            return res.status(201).json({ message: "Professor criado com sucesso.", id: newUser._id });

        } catch (error) {

            return res.status(500).json({ message: 'Erro ao criar usuário', error });
            
        }
    }
}

export default new UsersController();