import { setUser, readConfig } from "./config";
import { createUser, getUserByName, getUsers, usersReset, insertFeed, getFeedByName, getFeeds, getUserByID, getFeedByUrl, createFeedFollow, getFeedFollowsForUser, deleteFeedFollow, getNextFeedToFetch, markFeedFetched, createPost, getPostsForUser } from "./lib/db/queries/users";
import { XMLParser } from "fast-xml-parser";
import { feeds, users } from "./lib/db/schema";
import { int } from "drizzle-orm/mysql-core";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;

export async function handlerLogin(cmdName: string, userName: string): Promise<void> {
    if(! await getUserByName(userName)){
        throw new Error("this user does not exist");
    }
    setUser(userName);
    console.log(`Welcome, ${userName}`);
}

export async function handlerRegister(cmdName: string, userName: string): Promise<void> {
    if(userName === ""){
        throw new Error("No username was provided");
    }
    if(await getUserByName(userName)){
        throw new Error("the name is already registered");
    }
    let result = await createUser(userName);
    setUser(userName)
    console.log(`the user ${userName} has been registered and logged`);
    console.log(result);
}

export async function handlerReset(cmdName: string): Promise<void> {
    const result  = await usersReset();
    console.log("the db has been reset");
}

export async function handlerUsers(cmdName: string): Promise<void> {
    const users = await getUsers();
    const curUser = await readConfig().currentUserName;
    for(let user of  users){
        if(user.name === curUser){
            console.log(`* ${user.name} (current)`);
        }
        else{
            console.log(`* ${user.name}`);
        }
    }
}

export async function handlerAgg(cmdName:string, time_between_reqs: string): Promise<void> {
    console.log(`Collecting feeds every ${time_between_reqs}`);
    const timeBetweenRequests = parseDuration(time_between_reqs);
    scrapeFeeds().catch(handleError);

    const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
    }, timeBetweenRequests);
    await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
            console.log("Shutting down feed aggregator...");
            clearInterval(interval);
            resolve();
        });
    });
}

export async function handlerAddFeed(cmdName:string, user:User, feedName: string, url: string): Promise<void> {
    await insertFeed(user.name, feedName, url);
    let feed = await getFeedByName(feedName);
    const feedFollow = await createFeedFollow(user.id, feed.id);
    printFeed(user, feed)
}

export async function handlerFeeds(cmdName:string): Promise<void> {
    let feeds = await getFeeds();
    for(let feed of feeds){
        if(feed.user_id === null){
            continue;
        }
        console.log(`${feed.id}:`);
        console.log(`-name: ${feed.name}`);
        console.log(`-url: ${feed.url}`);
        console.log(`-user: ${(await getUserByID(feed.user_id)).name}`)
    }
}

export async function handlerFollow(cmdName:string, user: User, url:string): Promise<void> {
    const feed = await getFeedByUrl(url);
    const feedFollows = await createFeedFollow(user.id, feed.id);
    console.log(`the feed ${feedFollows.feedName} is followed by ${feedFollows.userName}`);
}

export async function handlerFollowing(cmdName:string, user: User): Promise<void> {
    const allfeedFollows = await getFeedFollowsForUser(user.id);
    console.log(`${user.name} is followwing:`)
    for(let feedFollow of allfeedFollows){
        console.log(`${feedFollow.feedName}`);
    }
}

export async function handlerUnfollow(cmdName: string, user: User, url: string): Promise<void> {
    const feed: Feed = await getFeedByUrl(url)
    const del = await deleteFeedFollow(user, feed);
}

export async function handlerBrowse(cmdName: string, limit: string | null): Promise<void> {
    if(limit === null){
        var l = 2;
    }
    else{
        var l = parseInt(limit)
    }
    const posts = getPostsForUser(l);
    if(Array.isArray(posts)){
        for(let post of posts){
            console.log(post);
        }
    }
    
}

export type commandRegistry = Record<string, CommandHandler>;

export function registerCommand(registry: commandRegistry, cmdName: string, handler: CommandHandler): void{
    registry[cmdName] = handler;
}

export async function runCommand(registry: commandRegistry, cmdName: string, ...args: string[]){
    if(!(cmdName in registry)){
        throw new Error("Unknown command");
    }
    await registry[cmdName](cmdName, ...args);
}


async function fetchFeed(feedURL: string){
    const result = await fetch(feedURL, {headers: {
        "User-Agent": "gator"
    }});
    let txt = await result.text();
    const parser = new XMLParser({
        processEntities: false
    });
    let jobj = parser.parse(txt);
    if(!("channel" in jobj.rss)){
        throw new Error("no channel");
    }
    let channel = jobj.rss.channel;
    if(!("title" in channel) || !("link" in channel) || !("description" in channel)){
        throw new Error("field is missing");
    }
    let metadata = {"title": channel.title, "link": channel.link, "description": channel.description};
    let items = [];
    if("item" in channel){
        if(Array.isArray(channel.item)){
            for(let i of channel.item){
                if(("title" in i) && ("link" in i) && ("description" in i) && ("pubDate" in i)){
                    items.push({"title": i.title, "link": i.link, "description": i.description, "pubDate": i.pubDate});
                }
            }
        }
        else{
            let i = channel.item;
            if(("title" in i) && ("link" in i) && ("description" in i) && ("pubDate" in i)){
                items.push({"title": i.title, "link": i.link, "description": i.description, "pubDate": i.pubDate});
            }
        }
    }
    else{
        channel.item = [];
    }
    return {"metadata": metadata, "items": items};
}

function printFeed(user: User, feed: Feed) {
    console.log("User:");
    console.log(`-created at: ${user.createdAt}`);
    console.log(`-id: ${user.id}`);
    console.log(`-name: ${user.name}`);
    console.log(`-updated at: ${user.updatedAt}`);
    console.log();
    console.log("Feed:");
    console.log(`-created at: ${feed.createdAt}`);
    console.log(`-id: ${feed.id}`);
    console.log(`-name: ${feed.name}`);
    console.log(`-url: ${feed.url}`);
    console.log(`-updated at: ${feed.updatedAt}`);
    console.log(`-user id: ${feed.user_id}`);
}

export type Feed = typeof feeds.$inferSelect;
export type User = typeof users.$inferSelect;

async function getCurrentUser() {
    let userName = readConfig().currentUserName;
    const user = await getUserByName(userName);
    return user;
}

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  // we return a NEW function matching the CommandHandler signature
  return async (cmdName: string, ...args: string[]) => {
    const user = await getCurrentUser();
    await handler(cmdName, user, ...args);
  };
}

async function scrapeFeeds() {
    const feed: Feed = await getNextFeedToFetch();
    if(feed.url === null){
        throw Error("there is no url")
    }
    const obj = await fetchFeed(feed.url);
    await markFeedFetched(feed.id);
    for(let item of obj.items){
        await createPost(item.title, item.link, item.description, item.pubDate, feed.id);
    }
}

function parseDuration(durationStr: string): number{
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);
    let time = 0;
    if(match === null){
        throw Error("invalid duration string")
    }
    
    if(match[2] === "ms"){
        time += parseInt(match[1]);
    }
    else if(match[2] === "s"){
        time += parseInt(match[1]) * 1000;
    }
    else if(match[2] === "m"){
        time += parseInt(match[1]) * 60000;
    }
    else{
        time += parseInt(match[1]) * 60000 * 60;
    }
    return time;
}
function handleError(err: unknown) {
  console.log(err);
}