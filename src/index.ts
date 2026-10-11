import {type commandRegistry, runCommand, registerCommand, handlerLogin, handlerRegister, handlerReset, handlerUsers, handlerAgg, handlerAddFeed, handlerFeeds, handlerFollow, handlerFollowing, middlewareLoggedIn, handlerUnfollow, handlerBrowse} from "./commands"

async function main(){
    try{
        let registry:commandRegistry = {};
        registerCommand(registry, "login", handlerLogin);
        registerCommand(registry, "register", handlerRegister);
        registerCommand(registry, "reset", handlerReset);
        registerCommand(registry, "users", handlerUsers);
        registerCommand(registry, "agg", handlerAgg);
        registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
        registerCommand(registry, "feeds", handlerFeeds);
        registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
        registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
        registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
        registerCommand(registry, "browse", handlerBrowse);
        if(process.argv.length < 3){
            console.error("no command provided");
            process.exit(1);
        }
        let cmdName = process.argv[2];
        let args = process.argv.slice(3);
        await runCommand(registry, cmdName, ...args);
        process.exit(0);
    }catch(err){
        if(err instanceof Error){
            console.error(err.message);
        }
        else{
            console.error(err);
        }
        process.exit(1);
    }
}

await main()