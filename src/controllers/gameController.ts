import { Request, Response } from 'express';
import gameService from '../services/gameService';

class GameController {

    public start = async (req: Request, res: Response) => {
        try {

            const { pin, nickname } = req.body;

            if (!pin || !nickname) {
                return res.status(400).json({ message: "PIN e nickname são obrigatórios." });
            }

            const result = await gameService.startGame(pin, nickname);

            if (!result.question) {
                return res.status(400).json({ message: "Nenhuma questão encontrada para os critérios atuais." });
            }

            return res.json(result);

        } catch (error) {

            console.error(error);
            return res.status(500).json({ message: "Erro ao iniciar jogo." });

        }
    }

    public answer = async (req: Request, res: Response) => {
        try {

            const { sessionId, questionId, answer } = req.body;
            const result = await gameService.processAnswer(sessionId, questionId, answer);
            return res.json(result);

        } catch (error: any) {

            return res.status(400).json({ message: error.message });

        }
    }

    public help = async (req: Request, res: Response) => {
        try {

            const { sessionId, type, questionId } = req.body;
            const result = await gameService.processHelp(sessionId, type, questionId);
            return res.json(result);

        } catch (error: any) {

            return res.status(400).json({ message: error.message });

        }
    }
}

export default new GameController();