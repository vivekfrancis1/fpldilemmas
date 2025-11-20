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

  private formatPriceChangeTweet(
    changes: PriceChange[],
    type: 'RISERS' | 'FALLERS',
    emoji: string,
    date: string
  ): string {
    const header = `💰 FPL Price Changes - ${date}\n${emoji} ${type} (${changes.length})`;
    
    const playerLines = changes.map(change => {
      const playerInfo = `${change.player_name} (${change.team_name}, ${change.position}, ${change.ownership.toFixed(1)}%)`;
      const priceChange = `${change.old_price.toFixed(1)} → ${change.new_price.toFixed(1)}`;
      return `${playerInfo} ${priceChange}`;
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
    try {
      const client = this.getClient();
      const risersSorted = [...data.risers].sort((a, b) => b.ownership - a.ownership);
      const fallersSorted = [...data.fallers].sort((a, b) => b.ownership - a.ownership);

      if (risersSorted.length > 0) {
        const risersTweet = this.formatPriceChangeTweet(risersSorted, 'RISERS', '📈', date);
        const risersResponse = await client.v2.tweet(risersTweet);
        console.log('✅ Posted risers tweet:', risersResponse.data.id);
      }

      if (fallersSorted.length > 0) {
        const fallersTweet = this.formatPriceChangeTweet(fallersSorted, 'FALLERS', '📉', date);
        const fallersResponse = await client.v2.tweet(fallersTweet);
        console.log('✅ Posted fallers tweet:', fallersResponse.data.id);
      }

      console.log('🎉 Successfully posted price change tweets');
    } catch (error) {
      console.error('❌ Error posting tweets:', error);
      throw error;
    }
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
