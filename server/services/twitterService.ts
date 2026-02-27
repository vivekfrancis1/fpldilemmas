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

  private formatPriceChangeTweet(
    changes: PriceChange[],
    type: 'RISERS' | 'FALLERS',
    emoji: string,
    date: string
  ): string {
    const formattedDate = this.formatDateWithoutYear(date);
    const header = `💰 FPL Price Changes - ${formattedDate}\n${emoji} ${type}`;
    
    const playerLines = changes.map(change => {
      const teamAbbr = this.getTeamAbbreviation(change.team_name);
      const posAbbr = this.getPositionAbbreviation(change.position);
      return `${change.player_name} (${teamAbbr}, ${posAbbr}): ${change.new_price.toFixed(1)}`;
    });

    const footer = `\nFull list: https://fpldilemmas.com/recent-price-changes\n#FPL #FantasyPremierLeague`;

    let tweet = header;
    for (const line of playerLines) {
      const testTweet = `${tweet}\n${line}${footer}`;
      if (testTweet.length > 280) {
        break;
      }
      tweet += `\n${line}`;
    }
    tweet += footer;

    return tweet;
  }

  async postPriceChangeTweets(data: TweetData, date: string): Promise<void> {
    const client = this.getClient();
    const risersSorted = [...data.risers].sort((a, b) => b.ownership - a.ownership);
    const fallersSorted = [...data.fallers].sort((a, b) => b.ownership - a.ownership);

    let risersSuccess = false;
    let fallersSuccess = false;

    if (risersSorted.length > 0) {
      try {
        const risersTweet = this.formatPriceChangeTweet(risersSorted, 'RISERS', '📈', date);
        console.log(`📤 Posting risers tweet (${risersTweet.length} chars, ${risersSorted.length} players)...`);
        const risersResponse = await client.v2.tweet(risersTweet);
        console.log('✅ Posted risers tweet:', risersResponse.data.id);
        risersSuccess = true;
      } catch (error) {
        console.error('❌ Error posting risers tweet:', error);
      }
    } else {
      console.log('ℹ️ No risers to post');
    }

    if (fallersSorted.length > 0) {
      try {
        const fallersTweet = this.formatPriceChangeTweet(fallersSorted, 'FALLERS', '📉', date);
        console.log(`📤 Posting fallers tweet (${fallersTweet.length} chars, ${fallersSorted.length} players)...`);
        const fallersResponse = await client.v2.tweet(fallersTweet);
        console.log('✅ Posted fallers tweet:', fallersResponse.data.id);
        fallersSuccess = true;
      } catch (error) {
        console.error('❌ Error posting fallers tweet:', error);
      }
    } else {
      console.log('ℹ️ No fallers to post');
    }

    if ((risersSorted.length === 0 || risersSuccess) && (fallersSorted.length === 0 || fallersSuccess)) {
      console.log('🎉 Successfully posted all price change tweets');
    } else {
      const failures = [];
      if (risersSorted.length > 0 && !risersSuccess) failures.push('risers');
      if (fallersSorted.length > 0 && !fallersSuccess) failures.push('fallers');
      throw new Error(`Failed to post ${failures.join(' and ')} tweets`);
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
