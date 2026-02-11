import mongoose, { Schema, Document } from 'mongoose';

export interface IGameConfig extends Document {
    temas_ativos: string[];
    modo_de_jogo: 'classico' | 'alternativo' | 'personalizado';
    permitir_repeticao: boolean;
    // Novos campos
    tempo_base: number; // 0 = sem tempo
    modo_tempo: 'fixo' | 'progressivo' | 'regressivo';
    esconder_nivel_visual: boolean;
    pontuacao_customizada?: Record<string, number>; // Usando Record para flexibilidade (JSON)
    exibir_ranking: boolean;
    updatedAt: Date;
}

const GameConfigSchema: Schema = new Schema({
    temas_ativos: { type: [String], default: [] },
    modo_de_jogo: { type: String, enum: ['classico', 'alternativo', 'personalizado'], default: 'classico' },
    permitir_repeticao: { type: Boolean, default: false },
    // Novos campos
    tempo_base: { type: Number, default: 0 },
    modo_tempo: { type: String, enum: ['fixo', 'progressivo', 'regressivo'], default: 'fixo' },
    esconder_nivel_visual: { type: Boolean, default: false },
    pontuacao_customizada: { type: Map, of: Number, default: {} }, // Ex: { "1": 100, "2": 500 }
    exibir_ranking: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IGameConfig>('GameConfig', GameConfigSchema);