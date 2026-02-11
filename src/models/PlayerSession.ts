import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerSession extends Document {
    roomId: mongoose.Types.ObjectId;
    nickname: string;
    pontuacao_atual: number;
    nivel_atual: number; // 1 a 5
    rodada_no_nivel: number; // 1 a 3 (são 3 perguntas por nível)
    questoes_respondidas: mongoose.Types.ObjectId[]; // IDs das questões já usadas NESTA sessão
    ajudas_usadas: {
        eliminar: boolean;
        plateia: boolean;
        chat: boolean;
    };
    erros_cometidos: number; // Para modo alternativo
    status: 'em_andamento' | 'vitoria' | 'derrota' | 'desistencia';
    historico_respostas: {
        questionId: mongoose.Types.ObjectId;
        enunciado: string;
        resposta_usuario: string;
        resposta_correta: string;
        correto: boolean;
    }[];
    createdAt: Date;
}

const PlayerSessionSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true }, // <--- NOVO
    nickname: { type: String, required: true },
    pontuacao_atual: { type: Number, default: 0 },
    nivel_atual: { type: Number, default: 1 },
    rodada_no_nivel: { type: Number, default: 1 },
    questoes_respondidas: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    historico_respostas: [{
        questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
        enunciado: String,
        resposta_usuario: String,
        resposta_correta: String,
        correto: { type: Boolean }
    }],
    ajudas_usadas: {
        eliminar: { type: Boolean, default: false },
        plateia: { type: Boolean, default: false },
        chat: { type: Boolean, default: false }
    },
    erros_cometidos: { type: Number, default: 0 },
    status: { type: String, enum: ['em_andamento', 'vitoria', 'derrota', 'desistencia'], default: 'em_andamento' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPlayerSession>('PlayerSession', PlayerSessionSchema);