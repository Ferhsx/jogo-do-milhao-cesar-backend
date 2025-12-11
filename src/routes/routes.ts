import { Router } from 'express';
import usersController from '../controllers/usersController';
import admController from '../controllers/admController';
import gameController from '../controllers/gameController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

// Auth
router.post('/auth/login', usersController.loginUser);
router.post('/auth/register', usersController.addUser);

router.get('/questions', verifyToken, admController.getQuestions);
router.post('/questions', verifyToken, admController.createQuestion);
router.put('/questions/:id', verifyToken, admController.updateQuestion);
router.delete('/questions/:id', verifyToken, admController.deleteQuestion);
router.get('/themes', verifyToken, admController.getAllThemes);

router.get('/config', verifyToken, admController.getConfig);
router.post('/config', verifyToken, admController.saveConfig);
router.post('/admin/reset', verifyToken, admController.resetHistory);

// Game (Público - Aluno)
router.post('/game/start', gameController.start);
router.post('/game/answer', gameController.answer);
router.post('/game/help', gameController.help);

export default router;