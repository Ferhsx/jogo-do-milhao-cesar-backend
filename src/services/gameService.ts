import Question, { IQuestion } from '../models/Questions';
import PlayerSession, { IPlayerSession } from '../models/PlayerSession';
import GameConfig from '../models/GameConfig';
import { GoogleGenAI } from "@google/genai";
import mongoose from 'mongoose';

// Mapeamento de nível numérico para string de dificuldade
const difficultyMap: Record<number, string> = {
    1: 'muito_facil',
    2: 'facil',
    3: 'medio',
    4: 'dificil',
    5: 'muito_dificil'
};

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || 'API_KEY_NOT_FOUND' });

export class GameService {

    public async startGame() {

        const session = await PlayerSession.create({});

        const question = await this.getNextQuestion(session);

        return { sessionStr: session._id, question, level: session.nivel_atual, score: session.pontuacao_atual };

    }

    public async getNextQuestion(session: IPlayerSession) {

        const config = await GameConfig.findOne() || { temas_ativos: [], permitir_repeticao: false };

        const difficulty = difficultyMap[session.nivel_atual];

        let query: any = {
            dificuldade: difficulty,
            tema: { $in: config.temas_ativos }
        };

        if (!config.temas_ativos || config.temas_ativos.length === 0) {
            delete query.tema;
        }

        if (!config.permitir_repeticao) {
            query._id = { $nin: session.questoes_respondidas };
        }

        const count = await Question.countDocuments(query);
        if (count === 0) return null;

        const random = Math.floor(Math.random() * count);
        const question = await Question.findOne(query).skip(random);

        if (question) {
            const allAlts = [question.alternativa_correta, ...question.alternativas_incorretas];

            const shuffledAlts = allAlts.sort(() => Math.random() - 0.5);

            return {
                id: question._id,
                enunciado: question.enunciado,
                tema: question.tema,
                dificuldade: question.dificuldade,
                alternativas: shuffledAlts,
                nivel: session.nivel_atual
            };
        }

        return null;

    }

    public async processAnswer(sessionId: string, questionId: string, answer: string) {

        const session = await PlayerSession.findById(sessionId);
        if (!session || session.status !== 'em_andamento') throw new Error("Sessão inválida ou finalizada.");

        const question = await Question.findById(questionId);
        if (!question) throw new Error("Questão não encontrada.");

        const config = await GameConfig.findOne();
        const mode = config?.modo_de_jogo || 'classico';

        const isCorrect = question.alternativa_correta === answer;

        session.questoes_respondidas.push(question._id as any);

        let feedback = "";
        let gameOver = false;

        if (isCorrect) {

            feedback = "Correto!";
            session.pontuacao_atual += (session.nivel_atual * 10);

            session.rodada_no_nivel++;
            if (session.rodada_no_nivel > 3) {
                session.rodada_no_nivel = 1;
                session.nivel_atual++;
            }

            if (session.nivel_atual > 5) {
                session.status = 'vitoria';
                gameOver = true;
                feedback = "Parabéns! Você completou o jogo.";
            }

        } else {
            // ERRO
            if (mode === 'classico') {
                session.status = 'derrota';
                gameOver = true;
                feedback = "Errado! Fim de jogo (Modo Clássico).";
            } else {

                session.erros_cometidos++;

                if (session.erros_cometidos >= 2) {
                    session.status = 'derrota';
                    gameOver = true;
                    feedback = "Errado! Segunda falha. Fim de jogo.";
                } else {
                    feedback = "Errado! Você recuou níveis.";
                    session.nivel_atual = Math.max(1, session.nivel_atual - 2);
                    session.rodada_no_nivel = 1;
                }
            }
        }

        await session.save();

        let nextQuestion = null;
        if (!gameOver) {
            nextQuestion = await this.getNextQuestion(session);
            if (!nextQuestion) {
                // Caso acabem as perguntas do banco
                gameOver = true;
                session.status = 'vitoria';
                feedback = "Não há mais perguntas disponíveis no banco!";
                await session.save();
            }
        }

        return {
            correct: isCorrect,
            feedback,
            gameOver,
            correctAnswer: question.alternativa_correta, // Revela a correta
            score: session.pontuacao_atual,
            nextQuestion
        };

    }

    public async processHelp(sessionId: string, type: 'eliminar' | 'plateia' | 'chat', questionId: string) {

        const session = await PlayerSession.findById(sessionId);
        if (!session) throw new Error("Sessão inválida.");

        if (session.ajudas_usadas[type]) {
            throw new Error("Ajuda já utilizada.");
        }

        const question = await Question.findById(questionId);
        if (!question) throw new Error("Questão inválida.");

        let result: any = {};

        if (type === 'eliminar') {

            let toEliminate = question.alternativas_para_eliminar;

            if (!toEliminate || toEliminate.length === 0) {
                toEliminate = question.alternativas_incorretas.slice(0, 2);
            }

            result = { remove: toEliminate };

        } else if (type === 'plateia') {

            result = { message: "Consulte a plateia para ajuda." };

        } else if (type === 'chat') {

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: String(question.enunciado) + "\nAlternativas: " + [question.alternativa_correta, ...question.alternativas_incorretas].join(", ") + "\nPor favor, forneça uma explicação detalhada da resposta correta.",
            });

            result = { message: response.text };
        }

        // Marca como usada
        session.ajudas_usadas[type] = true;
        await session.save();

        return result;
    }
}

export default new GameService();