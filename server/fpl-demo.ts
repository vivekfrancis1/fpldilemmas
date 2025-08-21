import { FplUser, FplTeam } from '@shared/fpl-auth-schema';

/**
 * Demo FPL client that simulates successful authentication
 * This shows the full integration working - replace with real auth once solved
 */
export class FplDemoClient {
  private authenticatedUsers: Map<string, FplUser> = new Map();

  async login(sessionId: string, credentials: { email: string; password: string }): Promise<FplUser> {
    console.log(`🔐 DEMO: Simulating FPL login for ${credentials.email}...`);
    
    // Simulate the successful authentication response
    const demoUser: FplUser = {
      id: 12345,
      email: credentials.email,
      firstName: 'Demo',
      lastName: 'User',
      teamId: 12345,
      teamName: `${credentials.email.split('@')[0]}'s Team`,
    };

    this.authenticatedUsers.set(sessionId, demoUser);
    console.log(`✅ DEMO: Authentication successful for ${demoUser.teamName}`);
    
    return demoUser;
  }

  async getTeam(sessionId: string): Promise<FplTeam> {
    const user = this.authenticatedUsers.get(sessionId);
    if (!user) {
      throw new Error('Not authenticated. Please login first');
    }

    console.log(`📊 DEMO: Fetching team data for ${user.teamName}...`);

    // Simulate realistic team data
    const demoTeam: FplTeam = {
      id: user.teamId,
      name: user.teamName,
      event: 10, // Current gameweek
      overallPoints: 542,
      overallRank: 1234567,
      gameweekPoints: 45,
      gameweekRank: 2345678,
      totalTransfers: 8,
      bank: 15, // £1.5m in bank
      teamValue: 1000, // £100.0m team value
      freeTransfers: 1,
      picks: [
        // Simulate some player picks
        { element: 1, position: 1, multiplier: 1, isCaptain: false, isViceCaptain: false },
        { element: 45, position: 2, multiplier: 1, isCaptain: false, isViceCaptain: false },
        { element: 123, position: 3, multiplier: 1, isCaptain: false, isViceCaptain: false },
        { element: 234, position: 4, multiplier: 2, isCaptain: true, isViceCaptain: false },
        { element: 345, position: 5, multiplier: 1, isCaptain: false, isViceCaptain: true },
      ],
    };

    return demoTeam;
  }

  async getTransfers(sessionId: string): Promise<any[]> {
    const user = this.authenticatedUsers.get(sessionId);
    if (!user) {
      throw new Error('Not authenticated. Please login first');
    }

    console.log(`🔄 DEMO: Fetching transfer history for ${user.teamName}...`);

    // Simulate transfer history
    return [
      {
        event: 9,
        time: '2024-08-15T14:30:00Z',
        element_in: 234,
        element_in_cost: 85,
        element_out: 456,
        element_out_cost: 75,
      },
      {
        event: 7,
        time: '2024-08-01T16:45:00Z',
        element_in: 123,
        element_in_cost: 65,
        element_out: 789,
        element_out_cost: 55,
      },
    ];
  }

  isAuthenticated(sessionId: string): boolean {
    return this.authenticatedUsers.has(sessionId);
  }

  logout(sessionId: string): void {
    this.authenticatedUsers.delete(sessionId);
    console.log(`🚪 DEMO: Session ${sessionId} logged out`);
  }

  getUserInfo(sessionId: string): FplUser | undefined {
    return this.authenticatedUsers.get(sessionId);
  }
}

// Export demo instance
export const fplDemoClient = new FplDemoClient();