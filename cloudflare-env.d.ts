declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    BOOTSTRAP_TOKEN?: string;
    NEWS_SYNC_TOKEN?: string;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
  }
}
