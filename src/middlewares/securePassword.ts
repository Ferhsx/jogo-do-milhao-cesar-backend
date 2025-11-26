import bcrypt from 'bcrypt';

export async function secureHash(password: string): Promise<string> {
    const saltRounds = 11;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashed = await bcrypt.hash(password, salt);
    return hashed;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}