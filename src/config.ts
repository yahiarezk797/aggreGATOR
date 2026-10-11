import fs from "fs";
import os from "os";
import path from "path";

type Config = {
    dbUrl: string;
    currentUserName: string;
}

export function setUser(name: string): void {
    let obj = getJsonObj()
    let newcfg: Config = {dbUrl: obj["db_url"], currentUserName: name};
    writeConfig(newcfg);
}

export function readConfig(): Config{
    let obj = getJsonObj()
    if(! isValidConfig(obj)){
        throw new Error("not valid config");
    }
    return {dbUrl: obj["db_url"], currentUserName: obj["current_user_name"]};
}

function getJsonObj(){
    let config_path = getConfigPath()
    let json = fs.readFileSync(config_path, "utf-8");
    return JSON.parse(json);
}

function getConfigPath(){
    return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config){
    let obj = {db_url: cfg.dbUrl, current_user_name: cfg.currentUserName};
    fs.writeFileSync(getConfigPath(), JSON.stringify(obj));
}

function isValidConfig(raw: any): boolean {
  return (
    typeof raw.db_url === "string" &&
    typeof raw.current_user_name === "string"
  );
}