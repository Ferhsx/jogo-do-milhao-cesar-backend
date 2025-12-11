import mongoose, { Schema, Document } from 'mongoose';

export interface IGameConfig extends Document {
    temas_ativos: string[];
    modo_de_jogo: 'classico' | 'alternativo';
    permitir_repeticao: boolean;
    updatedAt: Date;
}

const GameConfigSchema: Schema = new Schema({
    temas_ativos: { type: [String], default: [] },
    modo_de_jogo: { type: String, enum: ['classico', 'alternativo'], default: 'classico' },
    permitir_repeticao: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IGameConfig>('GameConfig', GameConfigSchema);