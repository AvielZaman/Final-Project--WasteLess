//backend/src/routes/DebugRoute.ts
import express from 'express';
import { auth } from 'express-oauth2-jwt-bearer';

const router = express.Router();

// Test route without any auth
router.get('/test/no-auth', (req, res) => {
  res.json({ message: 'No auth required', headers: req.headers });
});

// Test route with only jwtCheck
const debugJwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
});

router.get('/test/auth', debugJwtCheck, (req, res) => {
  // @ts-ignore
  const auth = req.auth;
  res.json({
    message: 'Auth successful',
    auth,
    headers: req.headers.authorization,
  });
});

export default router;
