import Question, { IQuestion } from '../models/Questions';
import PlayerSession, { IPlayerSession } from '../models/PlayerSession';
import GameConfig from '../models/GameConfig';
import { GoogleGenAI } from "@google/genai";
import mongoose from 'mongoose';
import Room from '../models/Room';
import Ranking from '../models/Ranking';

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

    public async startGame(pin: string, nickname: string) {

        const room = await Room.findOne({ pin, isActive: true });
        if (!room) throw new Error("Sala não encontrada ou encerrada.");

        // 2. Cria a sessão vinculada à sala
        const session = await PlayerSession.create({
            roomId: room._id,
            nickname: nickname
        });

        // 3. Busca pergunta baseada na config DA SALA
        const question = await this.getNextQuestion(session);

        // Prepara config para o front
        const configAny = room.config as any;
        const advancedConfig = {
            tempo_base: configAny.tempo_base || 0,
            modo_tempo: configAny.modo_tempo || 'fixo',
            esconder_nivel_visual: configAny.esconder_nivel_visual || false,
            exibir_ranking: configAny.exibir_ranking !== undefined ? configAny.exibir_ranking : true,
            pontuacao_customizada: configAny.pontuacao_customizada || {}
        };

        return {
            sessionStr: session._id,
            question,
            level: session.nivel_atual,
            score: session.pontuacao_atual,
            config: advancedConfig,
            roomId: room._id
        };
    }

    public async getNextQuestion(session: IPlayerSession) {

        // 1. Busca a SALA da sessão para ler as regras DELA
        const room = await Room.findById(session.roomId);
        if (!room) throw new Error("Sala da sessão não encontrada.");

        const config = room.config as any; // USA A CONFIG DA SALA, NÃO A GLOBAL
        const professorId = room.professorId; // ID do professor que criou a sala

        // ... O resto da lógica de buscar questão continua igual, 
        // mas agora 'config' vem da variável acima.
        const difficulty = difficultyMap[session.nivel_atual];

        let query: any = {
            dificuldade: difficulty,
            createdBy: professorId, // FILTRA PELO PROFESSOR DONO DA SALA
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

        // CORREÇÃO: Busca a config da SALA, e não a global
        const room = await Room.findById(session.roomId);
        const config = room?.config as any;
        const mode = config?.modo_de_jogo || 'classico';

        const isTimeout = answer === '__TEMPO_ESGOTADO__';
        const isCorrect = question.alternativa_correta === answer;

        session.questoes_respondidas.push(question._id as any);

        // Registrar no histórico de respostas
        session.historico_respostas.push({
            questionId: question._id as any,
            enunciado: question.enunciado,
            resposta_usuario: answer,
            resposta_correta: question.alternativa_correta,
            correto: isCorrect
        });

        let feedback = "";
        let gameOver = false;

        if (isCorrect) {
            feedback = "Correto!";

            // Lógica de Pontuação Customizada
            let pointsEarned = 0;
            if (config?.pontuacao_customizada && config.pontuacao_customizada.has(String(session.nivel_atual))) {
                pointsEarned = Number(config.pontuacao_customizada.get(String(session.nivel_atual)));
            } else {
                pointsEarned = session.nivel_atual * 10; // Default
            }

            session.pontuacao_atual += pointsEarned;

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

        } else if (isTimeout) {
            feedback = "Tempo esgotado! A pergunta foi pulada.";
            // Não penaliza, apenas pula (mantém nível e rodada)
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

        if (gameOver && config?.exibir_ranking) {
            const Ranking = (await import('../models/Ranking')).default;
            await Ranking.create({
                roomId: session.roomId as any,
                playerSessionId: session._id as any,
                nickname: session.nickname,
                score: session.pontuacao_atual
            });
        }

        await session.save();

        let nextQuestion = null;
        if (!gameOver) {
            nextQuestion = await this.getNextQuestion(session);

            // LOGICA INTELIGENTE: Se não houver perguntas no nível atual, avança para o próximo
            // até encontrar uma pergunta ou chegar no nível máximo.
            while (!nextQuestion && session.nivel_atual < 5) {
                console.log(`Sem perguntas no nível ${session.nivel_atual}. Avançando para nível ${session.nivel_atual + 1}...`);
                session.nivel_atual++;
                session.rodada_no_nivel = 1; // Reseta rodada para o novo nível

                nextQuestion = await this.getNextQuestion(session);

                // Se encontrou pergunta ao pular de nível, salva o novo estado da sessão (nível atualizado)
                if (nextQuestion) {
                    await session.save();
                }
            }

            if (!nextQuestion) {
                // Caso acabem as perguntas do banco (mesmo após tentar avançar)
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
            // Lógica de probabilidade da plateia baseada na dificuldade
            const diff = question.dificuldade || 'medio';
            const allAlts = [question.alternativa_correta, ...question.alternativas_incorretas];

            // Definição das chances de a plateia acertar (peso na correta)
            let correctWeight = 0;

            switch (diff) {
                case 'muito_facil': correctWeight = 0.90; break; // 90% de chance de ir na certa
                case 'facil': correctWeight = 0.75; break;
                case 'medio': correctWeight = 0.55; break;
                case 'dificil': correctWeight = 0.40; break; // Plateia começa a duvidar
                case 'muito_dificil': correctWeight = 0.25; break; // Quase chute (chute seria 25% em 4 alts)
                default: correctWeight = 0.50;
            }

            // Gera votos
            // Vamos distribuir 100 pontos
            const totalPoints = 100;
            const correctVotes = Math.floor(totalPoints * correctWeight); // Ex: 75 votos

            let accumulated = correctVotes;
            const incorrectVotesDistribution: number[] = [];

            // Distribui o resto aleatoriamente entre as incorretas
            const numIncorrect = question.alternativas_incorretas.length;
            let remainingPoints = totalPoints - correctVotes;

            for (let i = 0; i < numIncorrect; i++) {
                if (i === numIncorrect - 1) {
                    incorrectVotesDistribution.push(remainingPoints);
                } else {
                    const val = Math.floor(Math.random() * remainingPoints);
                    incorrectVotesDistribution.push(val);
                    remainingPoints -= val;
                }
            }

            // Cria o resultado final (mapeando texto -> votos)
            const votes: Record<string, number> = {};
            votes[question.alternativa_correta] = correctVotes;

            question.alternativas_incorretas.forEach((alt, idx) => {
                votes[alt] = incorrectVotesDistribution[idx];
            });

            // Formata mensagem bonitinha
            // Ordena por maior voto para ficar mais legível ou deixa misturado? 
            // Melhor mostrar: "Alternativa X: Y%"

            // Como não sabemos a ordem A/B/C/D do front, mandamos o texto por enquanto.
            // O ideal seria o front receber um objeto estruturado, mas vamos manter compatibilidade com msg string.

            const votesStr = Object.entries(votes)
                .map(([alt, count]) => `"${alt}": ${count}%`)
                .join(' | ');

            result = { message: `Votação da Plateia: ${votesStr}` };

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

    async getRanking(roomId: string) {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return [];
        }

        // Busca direto da sessão dos jogadores para ser em tempo real
        const sessions = await PlayerSession.find({ roomId })
            .sort({ pontuacao_atual: -1 })
            .limit(10)
            .select('nickname pontuacao_atual _id status createdAt');

        // Mapeia para o formato que o front espera
        return sessions.map(session => ({
            _id: session._id,
            playerSessionId: session._id,
            nickname: session.nickname,
            score: session.pontuacao_atual,
            status: session.status,
            completedAt: session.createdAt
        }));
    }

    async getSessionDetails(sessionId: string) {
        const session = await PlayerSession.findById(sessionId);
        if (!session) throw new Error("Sessão não encontrada.");
        return {
            nickname: session.nickname,
            score: session.pontuacao_atual,
            historico: session.historico_respostas,
            status: session.status,
            completedAt: session.createdAt
        };
    }

    async getAllSessionsDetails(roomId: string) {
        const sessions = await PlayerSession.find({ roomId });
        return sessions.map(session => ({
            nickname: session.nickname,
            score: session.pontuacao_atual,
            historico: session.historico_respostas,
            status: session.status,
            completedAt: session.createdAt
        }));
    }
}

export default new GameService();