import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import session from 'express-session';

dotenv.config();


const googleStrategy = new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
    },
    (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      const user = {
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value || '',
        avatar: profile.photos?.[0]?.value || '',
      };
      return done(null, user);
    }
  )



  export default googleStrategy;
  