import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './src/repositories/connectionDB';
import routes from './src/routes/routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
app.use(cors());
app.use(express.json());

// Conexão BD
connectDB();

// Rotas
app.use('/api', routes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});