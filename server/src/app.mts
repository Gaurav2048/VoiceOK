import express from "express";
import passport from 'passport';
import googleStrategy from "./auth/passport.mjs";
import { type Request, type Response, type NextFunction } from "express";
import authMiddleware from "./auth.middleware.mjs";
import httpStatus from "http-status";
import cors from "cors";


import jwt from 'jsonwebtoken';
import createLiveKitToken from "./auth/livekit.mjs";
import path from "node:path";
const JWT_SECRET = process.env.JWT_SECRET || '';

passport.use(googleStrategy);
passport.initialize();

const app = express();
app.use(express.json());
app.use(cors());


app.get(
  '/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failure', session: false }),
  (req: Request, res: Response) => {
    // Passport attaches the target profile object to req.user after validation
    const user = req.user;

    if (!user) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: 'User data parsing error.' });
      return;
    }

    // Sign a new token containing user details that expires in 24 hours
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    // Option A: Send the token back directly as a response
    res.json({
      message: 'Authentication Successful!',
      token: `Bearer ${token}`
    });
  }
);

// Protected Private Route (Using our JWT checker middleware instead of Passport hooks)
app.get('/profile', authMiddleware, (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to your stateless, secure profile!',
    user: req.user, // Parsed details directly out of the incoming JWT string
  });
});


app.get('/login-failure', (req: Request, res: Response) => {
  res.status(401).json({ error: 'Google Authentication failed.' });
});


app.post('/livekit/token', authMiddleware, async (req: Request, res: Response) => {

    const {
        serverUrl,
        participantToken
    } = await createLiveKitToken(); 
    
    res.status(httpStatus.OK).send({
        serverUrl,
        participantToken
    });

})

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

const frontendPath = path.resolve(process.cwd(), "public");
const indexPath = path.resolve(frontendPath, "index.html");

app.use(express.static(frontendPath));


app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(indexPath);
});



export default app;
