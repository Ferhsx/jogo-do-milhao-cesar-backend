import mongoose, { Schema, Document } from 'mongoose';

export interface IRanking extends Document {
    roomId: string; // ID da sala
    playerSessionId: string; // ID da sessão
    nickname: string;
    score: number;
    completedAt: Date;
}

const RankingSchema: Schema = new Schema({
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    playerSessionId: { type: Schema.Types.ObjectId, ref: 'PlayerSession', required: true },
    nickname: { type: String, required: true },
    score: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now }
});

// Índice para buscar ranking por sala rapidamente e ordenar por score
RankingSchema.index({ roomId: 1, score: -1 });

export default mongoose.model<IRanking>('Ranking', RankingSchema);
