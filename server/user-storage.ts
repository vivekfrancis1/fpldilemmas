/**
 * User storage system for OAuth + Team ID authentication
 */

export interface AuthUser {
  id: string;
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  fplTeamId?: number;
  fplTeamName?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  fplTeamId?: number;
  createdAt: Date;
  expiresAt: Date;
}

// In-memory storage for users and sessions
class UserStorageSystem {
  private users: Map<string, AuthUser> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private sessionsByUser: Map<string, string[]> = new Map();

  // User management
  createUser(userData: Omit<AuthUser, 'id' | 'createdAt' | 'lastActive'>): AuthUser {
    const userId = `${userData.provider}_${userData.providerId}`;
    const user: AuthUser = {
      ...userData,
      id: userId,
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    this.users.set(userId, user);
    console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.provider})`);
    return user;
  }

  updateUser(userId: string, updates: Partial<AuthUser>): AuthUser | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      lastActive: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    console.log(`📝 Updated user: ${updatedUser.firstName} ${updatedUser.lastName}`);
    return updatedUser;
  }

  getUser(userId: string): AuthUser | null {
    return this.users.get(userId) || null;
  }

  getUserByProvider(provider: string, providerId: string): AuthUser | null {
    const userId = `${provider}_${providerId}`;
    return this.getUser(userId);
  }

  // Connect FPL Team to user
  connectFplTeam(userId: string, fplTeamId: number, fplTeamName: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.fplTeamId = fplTeamId;
    user.fplTeamName = fplTeamName;
    user.lastActive = new Date();
    
    console.log(`🎯 Connected FPL Team ${fplTeamId} (${fplTeamName}) to user ${user.firstName}`);
    return true;
  }

  // Session management
  createSession(userId: string): UserSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = this.users.get(userId);
    
    const session: UserSession = {
      sessionId,
      userId,
      fplTeamId: user?.fplTeamId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    this.sessions.set(sessionId, session);
    
    // Track sessions by user
    const userSessions = this.sessionsByUser.get(userId) || [];
    userSessions.push(sessionId);
    this.sessionsByUser.set(userId, userSessions);

    console.log(`🔑 Created session ${sessionId} for user ${userId}`);
    return session;
  }

  getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }
    
    return session;
  }

  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);
    
    // Remove from user sessions
    const userSessions = this.sessionsByUser.get(session.userId) || [];
    const updatedSessions = userSessions.filter(id => id !== sessionId);
    this.sessionsByUser.set(session.userId, updatedSessions);

    console.log(`🚪 Deleted session ${sessionId}`);
    return true;
  }

  getUserFromSession(sessionId: string): AuthUser | null {
    const session = this.getSession(sessionId);
    if (!session) return null;
    
    return this.getUser(session.userId);
  }

  // Get user's FPL team info
  getUserFplTeam(sessionId: string): { teamId: number; teamName: string } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const user = this.getUser(session.userId);
    if (!user || !user.fplTeamId) return null;

    return {
      teamId: user.fplTeamId,
      teamName: user.fplTeamName || 'My Team',
    };
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(): number {
    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.deleteSession(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    }
    
    return deletedCount;
  }

  // Get stats
  getStats() {
    return {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      usersWithFplTeams: Array.from(this.users.values()).filter(u => u.fplTeamId).length,
    };
  }
}

export const userStorage = new UserStorageSystem();

// Cleanup expired sessions every hour
setInterval(() => {
  userStorage.cleanupExpiredSessions();
}, 60 * 60 * 1000);