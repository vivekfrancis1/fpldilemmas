import { TwitterApi } from 'twitter-api-v2';

interface PriceChange {
  player_name: string;
  team_name: string;
  position: string;
  new_price: number;
  old_price: number;
  ownership: number;
}

interface TweetData {
  risers: PriceChange[];
  fallers: PriceChange[];
}

export const TEAM_ABBREVIATIONS: Record<string, string> = {
  'Arsenal': 'ARS',
  'Aston Villa': 'AVL',
  'Bournemouth': 'BOU',
  'Brentford': 'BRE',
  'Brighton': 'BHA',
  'Brighton and Hove Albion': 'BHA',
  'Chelsea': 'CHE',
  'Crystal Palace': 'CRY',
  'Everton': 'EVE',
  'Fulham': 'FUL',
  'Ipswich': 'IPS',
  'Ipswich Town': 'IPS',
  'Leicester': 'LEI',
  'Leicester City': 'LEI',
  'Liverpool': 'LIV',
  'Man City': 'MCI',
  'Manchester City': 'MCI',
  'Man Utd': 'MUN',
  'Manchester United': 'MUN',
  'Newcastle': 'NEW',
  'Newcastle United': 'NEW',
  'Nott\'m Forest': 'NFO',
  'Nottingham Forest': 'NFO',
  'Southampton': 'SOU',
  'Spurs': 'TOT',
  'Tottenham': 'TOT',
  'Tottenham Hotspur': 'TOT',
  'West Ham': 'WHU',
  'West Ham United': 'WHU',
  'Wolves': 'WOL',
  'Wolverhampton Wanderers': 'WOL'
};

const POSITION_ABBREVIATIONS: Record<string, string> = {
  'Goalkeeper': 'GK',
  'Defender': 'DEF',
  'Midfielder': 'MID',
  'Forward': 'FWD'
};

export class TwitterService {
  private client: TwitterApi | null = null;

  constructor() {
    // Don't throw on initialization - allow server to start
    // Client will be created lazily when needed
  }

  private getClient(): TwitterApi {
    if (this.client) {
      return this.client;
    }

    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing Twitter API credentials in environment variables');
    }

    this.client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    return this.client;
  }

  private getTeamAbbreviation(teamName: string): string {
    return TEAM_ABBREVIATIONS[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  private getPositionAbbreviation(position: string): string {
    return POSITION_ABBREVIATIONS[position] || position;
  }

  private formatDateWithoutYear(dateStr: string): string {
    if (dateStr.match(/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/)) {
      return dateStr.replace(/\s+\d{4}$/, '');
    }
    
    if (dateStr.match(/^\d{1,2}\s+[A-Za-z]{3}$/)) {
      return dateStr;
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  async postPriceChangeTweets(data: TweetData, date: string): Promise<void> {
    const risersSorted = [...data.risers].sort((a, b) => b.ownership - a.ownership);
    const fallersSorted = [...data.fallers].sort((a, b) => b.ownership - a.ownership);

    if (risersSorted.length === 0 && fallersSorted.length === 0) {
      console.log('ℹ️ No price changes to post');
      return;
    }

    const formattedDate = this.formatDateWithoutYear(date);
    const footer = `\nFull list: https://fpldilemmas.com/recent-price-changes\n#FPL #FantasyPremierLeague #FPLCommunity`;

    const formatLine = (change: PriceChange) => {
      const teamAbbr = this.getTeamAbbreviation(change.team_name);
      const posAbbr = this.getPositionAbbreviation(change.position);
      return `${change.player_name} (${teamAbbr}, ${posAbbr}): ${change.new_price.toFixed(1)}`;
    };

    let body = `💰 FPL Price Changes - ${formattedDate}`;

    if (risersSorted.length > 0) {
      body += `\n\n📈 Risers`;
      for (const change of risersSorted) {
        const line = `\n${formatLine(change)}`;
        const reservedForFallers = fallersSorted.length > 0 ? `\n\n📉 Fallers` : '';
        if ((body + line + reservedForFallers + footer).length > 280) break;
        body += line;
      }
    }

    if (fallersSorted.length > 0) {
      const fallersHeader = `\n\n📉 Fallers`;
      if ((body + fallersHeader + footer).length <= 280) {
        body += fallersHeader;
        for (const change of fallersSorted) {
          const line = `\n${formatLine(change)}`;
          if ((body + line + footer).length > 280) break;
          body += line;
        }
      }
    }

    const tweet = body + footer;

    try {
      console.log(`📤 Posting price changes tweet (${tweet.length} chars, ${risersSorted.length} risers, ${fallersSorted.length} fallers)...`);
      const client = this.getClient();
      const response = await client.v2.tweet(tweet);
      console.log('✅ Posted price changes tweet:', response.data.id);
    } catch (error) {
      console.error('❌ Error posting price changes tweet:', error);
      throw new Error('Failed to post price changes tweet');
    }
  }

  async postTweet(text: string): Promise<string> {
    const client = this.getClient();
    console.log(`📤 Posting tweet (${text.length} chars)...`);
    const response = await client.v2.tweet(text);
    console.log('✅ Tweet posted:', response.data.id);
    return response.data.id;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.getClient();
      const me = await client.v2.me();
      console.log('✅ Twitter API connection successful. Authenticated as:', me.data.username);
      return true;
    } catch (error) {
      console.error('❌ Twitter API connection failed:', error);
      return false;
    }
  }
}

export const twitterService = new TwitterService();
