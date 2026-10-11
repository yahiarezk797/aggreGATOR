import { db } from "..";
import { feeds, users, feed_follows, posts } from "../schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { type Feed, type User } from "src/commands";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const [user] = await db.select().from(users).where(eq(users.name, name));
  return user;
}

export async function usersReset() {
  const delUsers = await db.delete(users);
  return delUsers;
}

export async function getUsers() {
  const allUsers = await db.select().from(users);
  return allUsers;
}

export async function getUserByID(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function insertFeed(userName: string, feedName: string, url: string) {
  let user_id = (await getUserByName(userName)).id;
  await db.insert(feeds).values({name: feedName, url: url, user_id:user_id});
}

export async function getFeedByName(feedName:string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.name, feedName));
  return feed;
}

export async function getFeedByUrl(url:string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, url));
  return feed;
}

export async function getFeeds() {
  const allfeeds = await db.select().from(feeds);
  return allfeeds;
}

export async function markFeedFetched(id:string) {
  await db.update(feeds).set({lastFetchedAt: new Date(), updatedAt: new Date()}).where(eq(feeds.id, id));
}

export async function getNextFeedToFetch() {
  const [feed]: Feed[] = await db.execute(sql`SELECT * FROM ${feeds} ORDER BY ${feeds.lastFetchedAt} ASC NULLS FIRST`);
  return feed;
}

export async function createFeedFollow(user_id: string, feed_id: string) {
  try {
    const [newFeedFollow] = await db
      .insert(feed_follows)
      .values({ user_id: user_id, feed_id: feed_id })
      .returning();
    const result = getFeedFollowWithNames(newFeedFollow);
    return result;
  } catch (err) {
    console.error("DEBUG CREATE FEED FOLLOW ERROR:", err);
    throw err;
  }
}


async function getFeedFollowWithNames(feedFollow: typeof feed_follows.$inferSelect) {
  const [result] = await db.select({userName: users.name, feedName: feeds.name, feed_followsID: feed_follows.id, feed_followsCreatedAt: feed_follows.createdAt, feed_followsUpdatedAt: feed_follows.updatedAt,}).from(feed_follows).innerJoin(users, eq(feed_follows.user_id, users.id)).innerJoin(feeds, eq(feed_follows.feed_id, feeds.id)).where(eq(feed_follows.id, feedFollow.id));
  return result;
}

export async function getFeedFollowsForUser(id: string) {
  const feedFollows = await db.select().from(feed_follows).where(eq(feed_follows.user_id, id));
  let allfeedFollows = [];
  for(let feedFollow of feedFollows){
    allfeedFollows.push(await getFeedFollowWithNames(feedFollow));
  }
  return allfeedFollows;
}

export async function  deleteFeedFollow(user: typeof users.$inferSelect, feed: typeof feeds.$inferSelect) {
  const delFeedFollow = await db.delete(feed_follows).where(and(eq(feed_follows.user_id, user.id), eq(feed_follows.feed_id, feed.id)));
  return delFeedFollow;
}

export async function createPost(title:string, url: string, description: string | null, publishedAt: string, feedID: string) {
  try{
    const [result] = await db
      .insert(posts)
      .values({ title: title, url: url, description: description, publishedAt: new Date(publishedAt), feedID: feedID})
      .returning();
    return result;
  }catch(err){
    console.log("Error Couldn't create the post")
  }
}

export async function getPostsForUser(limit: number) {
  const allPosts = await db.select().from(posts).orderBy(desc(posts.publishedAt)).limit(limit);
  return allPosts;
}