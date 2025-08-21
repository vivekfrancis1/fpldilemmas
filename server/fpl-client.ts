import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import FormData from 'form-data';

import { FplLoginData, FplUser, FplTeam } from '@shared/fpl-auth-schema';

interface FplSession {
  client: AxiosInstance;
  jar: CookieJar;
  isAuthenticated: boolean;
  managerId?: number;
  userInfo?: FplUser;
}

export class FplClient {
  private sessions: Map<string, FplSession> = new Map();

  private createSession(): FplSession {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }));

    return {
      client,
      jar,
      isAuthenticated: false,
    };
  }

  async login(sessionId: string, credentials: FplLoginData): Promise<FplUser> {
    const session = this.createSession();
    
    try {
      // Create FormData as per working examples
      const form = new FormData();
      form.append('login', credentials.email);
      form.append('password', credentials.password);
      form.append('app', 'plfpl-web');
      form.append('redirect_uri', 'https://fantasy.premierleague.com/a/login');

      // Perform login
      console.log(`🔐 Attempting FPL login for ${credentials.email}...`);
      const loginResponse = await session.client.post(
        'https://users.premierleague.com/accounts/login/',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Referer': 'https://fantasy.premierleague.com/',
          },
          maxRedirects: 5,
        }
      );

      console.log('Login response status:', loginResponse.status);
      console.log('Login response headers:', loginResponse.headers);
      console.log('Cookies in jar:', session.jar.getCookiesSync('https://fantasy.premierleague.com'));

      // Check if login was successful by trying to access profile
      console.log(`📋 Checking login status...`);
      const profileResponse = await session.client.get(
        'https://fantasy.premierleague.com/api/me/'
      );

      console.log('Profile response:', profileResponse.status, JSON.stringify(profileResponse.data, null, 2));

      if (!profileResponse.data || !profileResponse.data.player) {
        console.log('❌ No player data found, login failed');
        throw new Error('Invalid email or password');
      }

      const profile = profileResponse.data.player;
      
      // Get team information
      const teamResponse = await session.client.get(
        `https://fantasy.premierleague.com/api/my-team/${profile.entry}/`
      );

      const userInfo: FplUser = {
        id: profile.entry,
        email: credentials.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        teamId: profile.entry,
        teamName: teamResponse.data.name || `${profile.first_name}'s Team`,
      };

      session.isAuthenticated = true;
      session.managerId = profile.entry;
      session.userInfo = userInfo;

      // Store session
      this.sessions.set(sessionId, session);

      console.log(`✅ FPL login successful for ${userInfo.teamName}`);
      return userInfo;

    } catch (error: any) {
      console.error('FPL login failed:', error.message);
      
      if (error.response?.status === 403) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to Fantasy Premier League. Please try again');
      } else {
        throw new Error('Login failed. Please check your credentials and try again');
      }
    }
  }

  async getTeam(sessionId: string): Promise<FplTeam> {
    const session = this.sessions.get(sessionId);
    
    if (!session?.isAuthenticated || !session.managerId) {
      throw new Error('Not authenticated. Please login first');
    }

    try {
      console.log(`📊 Fetching team data for manager ${session.managerId}...`);
      
      // Get current team picks and data
      const [teamResponse, picksResponse] = await Promise.all([
        session.client.get(`https://fantasy.premierleague.com/api/my-team/${session.managerId}/`),
        session.client.get(`https://fantasy.premierleague.com/api/entry/${session.managerId}/`)
      ]);

      const teamData = teamResponse.data;
      const entryData = picksResponse.data;
      
      // Get current gameweek picks
      let currentPicks = [];
      if (teamData.picks && teamData.picks.length > 0) {
        currentPicks = teamData.picks.map((pick: any) => ({
          element: pick.element,
          position: pick.position,
          multiplier: pick.multiplier,
          isCaptain: pick.is_captain || false,
          isViceCaptain: pick.is_vice_captain || false,
        }));
      }

      const team: FplTeam = {
        id: session.managerId,
        name: entryData.name || session.userInfo?.teamName || 'My Team',
        event: teamData.entry_history?.event || 1,
        overallPoints: entryData.summary_overall_points || 0,
        overallRank: entryData.summary_overall_rank || 0,
        gameweekPoints: teamData.entry_history?.points || 0,
        gameweekRank: teamData.entry_history?.rank || 0,
        totalTransfers: teamData.entry_history?.total_transfers || 0,
        bank: teamData.transfers?.bank || 0,
        teamValue: teamData.transfers?.value || 1000, // Default 100.0m in tenths
        freeTransfers: teamData.transfers?.limit || 1,
        picks: currentPicks,
      };

      console.log(`✅ Team data retrieved: ${team.name} (${team.overallPoints} pts)`);
      return team;

    } catch (error: any) {
      console.error('Failed to fetch team data:', error.message);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Session expired
        this.sessions.delete(sessionId);
        throw new Error('Session expired. Please login again');
      } else {
        throw new Error('Failed to fetch team data. Please try again');
      }
    }
  }

  async getTransfers(sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    
    if (!session?.isAuthenticated || !session.managerId) {
      throw new Error('Not authenticated. Please login first');
    }

    try {
      console.log(`🔄 Fetching transfers for manager ${session.managerId}...`);
      
      const transfersResponse = await session.client.get(
        `https://fantasy.premierleague.com/api/entry/${session.managerId}/transfers/`
      );

      return transfersResponse.data || [];

    } catch (error: any) {
      console.error('Failed to fetch transfers:', error.message);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.sessions.delete(sessionId);
        throw new Error('Session expired. Please login again');
      } else {
        throw new Error('Failed to fetch transfers. Please try again');
      }
    }
  }

  async getGameweekPicks(sessionId: string, gameweek: number): Promise<any> {
    const session = this.sessions.get(sessionId);
    
    if (!session?.isAuthenticated || !session.managerId) {
      throw new Error('Not authenticated. Please login first');
    }

    try {
      console.log(`📋 Fetching gameweek ${gameweek} picks for manager ${session.managerId}...`);
      
      const picksResponse = await session.client.get(
        `https://fantasy.premierleague.com/api/entry/${session.managerId}/event/${gameweek}/picks/`
      );

      return picksResponse.data;

    } catch (error: any) {
      console.error('Failed to fetch gameweek picks:', error.message);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.sessions.delete(sessionId);
        throw new Error('Session expired. Please login again');
      } else {
        throw new Error('Failed to fetch gameweek picks. Please try again');
      }
    }
  }

  isAuthenticated(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isAuthenticated || false;
  }

  logout(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`🚪 Session ${sessionId} logged out`);
  }

  getUserInfo(sessionId: string): FplUser | undefined {
    const session = this.sessions.get(sessionId);
    return session?.userInfo;
  }
}

// Create and export a singleton instance
export const fplClient = new FplClient();