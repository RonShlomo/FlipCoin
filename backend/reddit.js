import "dotenv/config";
import Snoowrap from "snoowrap";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let redditInstance = null;

export function getReddit() {
  if (!redditInstance) {
    redditInstance = new Snoowrap({
      userAgent: must("REDDIT_USER_AGENT"),
      clientId: must("REDDIT_CLIENT_ID"),
      clientSecret: must("REDDIT_CLIENT_SECRET"),
      username: must("REDDIT_USERNAME"),
      password: must("REDDIT_PASSWORD"),
    });
  }
  return redditInstance;
}
