import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
    enunciado: string;
    tema: string;
    dificuldade: 'muito_facil' | 'facil' | 'medio' | 'dificil' | 'muito_dificil';
    alternativa_correta: string;
    alternativas_incorretas: string[];
    alternativas_para_eliminar?: string[]; // Para a ajuda "Eliminar"
    createdAt: Date;
}

const QuestionSchema: Schema = new Schema({
    enunciado: { type: String, required: true },
    tema: { type: String, required: true },
    dificuldade: { 
        type: String, 
        enum: ['muito_facil', 'facil', 'medio', 'dificil', 'muito_dificil'],
        required: true 
    },
    alternativa_correta: { type: String, required: true },
    alternativas_incorretas: { type: [String], required: true },
    alternativas_para_eliminar: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);