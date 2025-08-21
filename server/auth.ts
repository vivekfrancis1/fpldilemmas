import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import crypto from "crypto";

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expires: Date; attempts: number }>();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log(`📧 OTP for ${email}: ${otp}`);
  console.log(`🔗 For development: Use OTP ${otp} to login with ${email}`);
  return Promise.resolve(true);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Send OTP to email
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      // Generate OTP
      const otp = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(email, { otp, expires, attempts: 0 });

      // Send OTP via email
      const sent = await sendOTPEmail(email, otp);
      
      if (sent) {
        res.json({ message: "OTP sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send OTP" });
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify OTP and login
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const storedOTP = otpStore.get(email);
      
      if (!storedOTP) {
        return res.status(400).json({ message: "OTP not found or expired" });
      }

      if (storedOTP.expires < new Date()) {
        otpStore.delete(email);
        return res.status(400).json({ message: "OTP expired" });
      }

      if (storedOTP.attempts >= 3) {
        otpStore.delete(email);
        return res.status(400).json({ message: "Too many attempts. Request a new OTP." });
      }

      if (storedOTP.otp !== otp) {
        storedOTP.attempts++;
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // OTP is valid, create or get user
      const user = await storage.upsertUser({
        id: `email_${email}`,
        email: email,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        provider: "email"
      });

      // Clean up OTP
      otpStore.delete(email);

      // Set user session
      (req.session as any).userId = user.id;
      (req.session as any).user = user;

      res.json({ user, message: "Login successful" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};