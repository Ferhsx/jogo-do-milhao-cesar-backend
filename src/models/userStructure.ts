// Estruturas de dados que representam as tabelas do banco de dados de usuários.

export interface User {
    id?: string;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    createdAt: Date;
    isBlocked?: boolean;
}

export interface UserWithoutPassword {
    id?: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
}

export interface LoginCredentials {
    email: string;
    password: string;
}