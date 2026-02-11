import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
    pin: string; // O código de 6 dígitos (ex: "123456")
    professorId: mongoose.Types.ObjectId; // Quem criou
    config: { // Cópia da configuração no momento da criação
        temas_ativos: string[];
        modo_de_jogo: 'classico' | 'alternativo' | 'personalizado';
        permitir_repeticao: boolean;
        tempo_base: number;
        modo_tempo: 'fixo' | 'progressivo' | 'regressivo';
        esconder_nivel_visual: boolean;
        exibir_ranking: boolean;
        pontuacao_customizada?: Record<string, number>;
    };
    isActive: boolean;
    createdAt: Date;
}

const RoomSchema: Schema = new Schema({
    pin: { type: String, required: true, unique: true },
    professorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    config: {
        temas_ativos: [String],
        modo_de_jogo: { type: String, default: 'classico', enum: ['classico', 'alternativo', 'personalizado'] },
        permitir_repeticao: { type: Boolean, default: false },
        tempo_base: { type: Number, default: 0 },
        modo_tempo: { type: String, default: 'fixo', enum: ['fixo', 'progressivo', 'regressivo'] },
        esconder_nivel_visual: { type: Boolean, default: false },
        exibir_ranking: { type: Boolean, default: true },
        pontuacao_customizada: { type: Map, of: Number, default: {} }
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now, expires: '24h' } // Sala expira em 24h automaticamente
});

export default mongoose.model<IRoom>('Room', RoomSchema);