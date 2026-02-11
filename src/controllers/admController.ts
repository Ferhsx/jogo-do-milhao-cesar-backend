import { Request, Response } from 'express';
import Question from '../models/Questions';
import GameConfig from '../models/GameConfig';
import PlayerSession from '../models/PlayerSession';
import Room from '../models/Room';
import importService from '../services/importService';

class AdmController {

    // Questões

    public importQuestions = async (req: Request, res: Response) => {
        try {
            const { text } = req.body;
            if (!text) return res.status(400).json({ message: "Texto não fornecido." });

            const userId = (req as any).user.id;
            const parsed = importService.parseQuestions(text);
            const count = await importService.saveQuestions(parsed, userId);

            return res.json({ success: true, count, message: `${count} questões importadas com sucesso.` });
        } catch (error) {
            return res.status(500).json({ message: "Erro ao importar questões.", error });
        }
    }

    public getQuestions = async (req: Request, res: Response) => {
        try {

            const userId = (req as any).user.id;
            const questions = await Question.find({ createdBy: userId }).sort({ createdAt: -1 });
            return res.json(questions);

        } catch (error) {

            return res.status(500).json({ message: "Erro ao buscar questões." });

        }
    }

    public createQuestion = async (req: Request, res: Response) => {
        try {

            const userId = (req as any).user.id;
            const questionData = { ...req.body, createdBy: userId };
            const question = await Question.create(questionData);
            return res.status(201).json(question);

        } catch (error) {

            return res.status(400).json({ message: "Erro ao criar questão.", error });

        }
    }

    public updateQuestion = async (req: Request, res: Response) => {
        try {

            const userId = (req as any).user.id;
            const { id } = req.params;
            const updated = await Question.findOneAndUpdate(
                { _id: id, createdBy: userId },
                req.body,
                { new: true }
            );
            if (!updated) return res.status(404).json({ message: "Questão não encontrada ou sem permissão." });
            return res.json(updated);

        } catch (error) {
            return res.status(500).json({ message: "Erro ao atualizar." });
        }
    }

    public deleteQuestion = async (req: Request, res: Response) => {
        try {

            const userId = (req as any).user.id;
            const { id } = req.params;
            const deleted = await Question.findOneAndDelete({ _id: id, createdBy: userId });
            if (!deleted) return res.status(404).json({ message: "Questão não encontrada ou sem permissão." });
            return res.status(204).send();

        } catch (error) {

            return res.status(500).json({ message: "Erro ao deletar." });

        }
    }

    public getAllThemes = async (req: Request, res: Response) => {
        try {

            const userId = (req as any).user.id;
            const themes = await Question.distinct('tema', { createdBy: userId });
            return res.json(themes);

        } catch (error) {

            return res.status(500).json({ message: "Erro ao buscar temas." });

        }
    }

    // Configurações

    public getConfig = async (req: Request, res: Response) => {
        try {

            let config = await GameConfig.findOne();
            if (!config) config = await GameConfig.create({});
            return res.json(config);

        } catch (error) {

            return res.status(500).json({ message: "Erro ao obter config." });

        }
    }

    public saveConfig = async (req: Request, res: Response) => {
        try {

            // Atualiza ou cria (upsert)
            const config = await GameConfig.findOneAndUpdate({}, req.body, { upsert: true, new: true });
            return res.json(config);

        } catch (error) {

            return res.status(500).json({ message: "Erro ao salvar config." });

        }
    }

    public resetHistory = async (req: Request, res: Response) => {
        try {

            await PlayerSession.deleteMany({});

            return res.json({ message: "Histórico de sessões resetado com sucesso." });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao resetar." });
        }
    }

    public createRoom = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;
            const { config } = req.body; // O professor envia a config desejada

            // Gera PIN de 6 dígitos
            const pin = Math.floor(100000 + Math.random() * 900000).toString();

            const room = await Room.create({
                pin,
                professorId: userId,
                config: config // Salva o "snapshot" da configuração atual
            });

            return res.status(201).json({ success: true, pin, roomId: room._id });

        } catch (error) {
            return res.status(500).json({ message: "Erro ao criar sala." });
        }
    }
}

export default new AdmController();