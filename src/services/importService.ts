import { IQuestion } from '../models/Questions';
import Question from '../models/Questions';

interface ParsedQuestion {
    enunciado: string;
    tema: string;
    dificuldade: string;
    alternativa_correta: string;
    alternativas_incorretas: string[];
}

class ImportService {

    public parseQuestions(text: string): ParsedQuestion[] {
        const questions: ParsedQuestion[] = [];

        // Remove espaços extras e divide por blocos de linhas
        // Vamos considerar que cada linha vazia separa uma questão ou usar o padrão de fechamento '}'

        // Melhor abordagem: Regex para capturar blocos
        // Padrão: ::Tema:: Enunciado { ... } [dificuldade]

        // 1. Normaliza quebras de linha
        const normalizedText = text.replace(/\r\n/g, '\n');

        // Regex explicada:
        // ::(.*)::       -> Captura Tema (Grupo 1)
        // \s*(.*?)       -> Captura Enunciado (Grupo 2) - lazy
        // \s*\{          -> Abre bloco
        // ([\s\S]*?)     -> Captura conteúdo das alternativas (Grupo 3)
        // \}             -> Fecha bloco
        // \s*(?:\[(.*?)\])? -> Captura dificuldade opcional (Grupo 4)
        const regex = /::(.*?)::\s*(.*?)\s*\{([\s\S]*?)\}\s*(?:\[(.*?)\])?/g;

        let match;
        while ((match = regex.exec(normalizedText)) !== null) {
            const tema = match[1].trim();
            const enunciado = match[2].trim();
            const alternativasBlock = match[3].trim();
            const dificuldadeRaw = match[4] ? match[4].trim() : 'medio';

            // Processa alternativas
            const lines = alternativasBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            let correta = '';
            const incorretas: string[] = [];

            for (const line of lines) {
                if (line.startsWith('=')) {
                    correta = line.substring(1).trim();
                } else if (line.startsWith('~')) {
                    incorretas.push(line.substring(1).trim());
                }
            }

            // Validação mínima
            if (tema && enunciado && correta && incorretas.length > 0) {
                questions.push({
                    tema,
                    enunciado,
                    alternativa_correta: correta,
                    alternativas_incorretas: incorretas,
                    dificuldade: this.normalizeDifficulty(dificuldadeRaw)
                });
            }
        }

        return questions;
    }

    private normalizeDifficulty(diff: string): string {
        const valid = ['muito_facil', 'facil', 'medio', 'dificil', 'muito_dificil'];
        // Remove acentos e lower case
        const clean = diff.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(' ', '_');

        if (valid.includes(clean)) return clean;

        // Tentativa de mapeamento
        if (clean.includes('muito facil')) return 'muito_facil';
        if (clean.includes('facil')) return 'facil';
        if (clean.includes('medio')) return 'medio';
        if (clean.includes('muito dificil')) return 'muito_dificil';
        if (clean.includes('dificil')) return 'dificil';

        return 'medio'; // Default
    }

    public async saveQuestions(parsedQuestions: ParsedQuestion[]) {
        let count = 0;
        for (const q of parsedQuestions) {
            // Cria nova questão
            await Question.create({
                enunciado: q.enunciado,
                tema: q.tema,
                dificuldade: q.dificuldade,
                alternativa_correta: q.alternativa_correta,
                alternativas_incorretas: q.alternativas_incorretas
            });
            count++;
        }
        return count;
    }
}

export default new ImportService();
