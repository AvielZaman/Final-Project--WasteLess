// backend/src/routes/MyUserRoute.ts
import express, { RequestHandler } from 'express';
import * as MyUserController from '../controllers/MyUserController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

// GET route - uses both jwtCheck and jwtParse
router.get(
  '/',
  jwtCheck,
  jwtParse,
  MyUserController.getCurrentUser as RequestHandler
);

// POST route - ONLY jwtCheck (NO jwtParse!)
router.post(
  '/',
  jwtCheck, // <-- Only this, remove jwtParse!
  MyUserController.createCurrentUser as RequestHandler
);

// DELETE route - delete user account
router.delete(
  '/',
  jwtCheck,
  jwtParse,
  MyUserController.deleteCurrentUser as RequestHandler
);

export default router;