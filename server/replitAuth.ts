import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { userActivityLogs, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only set up Google OAuth if credentials are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // GOOGLE_CALLBACK_URL (explicit, e.g. the fpldilemmas.com custom domain) always wins —
    // Google OAuth matches redirect URIs exactly, so this should point at whatever domain is
    // actually registered as an Authorized redirect URI in Google Cloud Console. The two
    // fallbacks below only matter when that's unset: RAILWAY_PUBLIC_DOMAIN is set automatically
    // by Railway (e.g. fpldilemmas-production.up.railway.app), and the REPL_SLUG/REPL_OWNER
    // branch is legacy from when this app was hosted on Replit (harmless to keep, just dead
    // in practice on Railway).
    const callbackURL = process.env.GOOGLE_CALLBACK_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/auth/google/callback`
        : process.env.REPL_SLUG && process.env.REPL_OWNER
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`
          : 'http://localhost:5000/api/auth/google/callback');

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await storage.upsertUser({
              id: profile.id,
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );

    app.get("/api/auth/google",
      passport.authenticate("google", {
        scope: ["profile", "email"],
        // Without this, Google silently reuses the browser's existing session and skips
        // the account chooser whenever only one Google account is signed in (or consent
        // was already granted) — forcing it open lets users pick/switch accounts every time.
        prompt: "select_account"
      })
    );

    app.get("/api/auth/google/callback",
      passport.authenticate("google", {
        failureRedirect: "/login"
      }),
      (req, res) => {
        const user = req.user as any;
        if (user) {
          try {
            const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress;
            db.insert(userActivityLogs).values({
              activityType: 'login',
              managerId: user.fplManagerId || null,
              managerName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null,
              email: user.email || null,
              userId: user.id || null,
              ipAddress: ipAddress || null,
              userAgent: req.headers['user-agent'] || '',
              metadata: { method: 'google_oauth' },
            }).catch(err => console.error('Failed to log Google login:', err));
          } catch (err) {
            console.error('Failed to log Google login:', err);
          }
        }
        res.redirect("/");
      }
    );
  } else {
    // No Google credentials — redirect to login page with a message
    app.get("/api/auth/google", (_req, res) => {
      res.redirect("/login?error=google_not_configured");
    });
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Email / password login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        fplManagerId: user.fplManagerId,
      };

      return res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "An error occurred during login" });
    }
  });

  // Current user endpoint
  app.get("/api/auth/user", (req, res) => {
    // Check passport authentication (Google OAuth)
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        firstName: user.firstName,
        lastName: user.lastName,
        fplManagerId: user.fplManagerId,
      });
    }

    // Check session-based authentication (email/password)
    const sessionUser = (req.session as any)?.user;
    if (sessionUser) {
      return res.json(sessionUser);
    }

    return res.status(401).json({ message: "Unauthorized" });
  });

  // Logout — support both GET and POST
  const logoutHandler = (req: any, res: any) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect("/login");
      });
    });
  };

  app.get("/api/auth/logout", logoutHandler);
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated() || (req.session as any)?.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

/**
 * Resolves the authenticated user's id from whichever of the two auth shapes isAuthenticated
 * just accepted: Passport/Google OAuth populates req.user; the local email/password login path
 * (the /api/auth/login handler below) sets req.session.user directly instead and never touches
 * req.user at all. Route handlers that read req.user.id unconditionally throw for every
 * session-based login — this was happening on /api/fpl/status, /api/fpl/my-team, and several
 * other endpoints, silently breaking "connect your FPL account" for anyone not using Google.
 */
export function getAuthenticatedUserId(req: any): string | undefined {
  return req.user?.id || (req.session as any)?.user?.id;
}
