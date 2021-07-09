
/**
 * Runs the leaveallgroups command
 * @param {Function} chatmsg The chatmsg function
 * @param {Object} steamID The steamID object from steam-use
 * @param {Object} lang The language object
 * @param {Number} loginindex The loginindex of the calling account
 * @param {Array} args The args array
 */
module.exports.run = (chatmsg, steamID, lang, loginindex, args) => {
    var fs         = require("fs")

    var controller = require("../../controller/controller.js")


    if (!args[0]) { 
        fs.readFile('./config.json', function(err, data) { //Use readFile to get an unprocessed object
            if (err) return chatmsg(steamID, lang.settingscmdfailedread + err)
            chatmsg(steamID, lang.settingscmdcurrentsettings + "\n" + data.toString().slice(1, -1)) //remove first and last character which are brackets
        })
        return; 
    }

    if (!args[1]) return chatmsg(steamID, "Please provide a new value for the key you want to change!")

    //Block those 3 values to don't allow another owner to take over ownership
    if (args[0] == "enableevalcmd" || args[0] == "ownerid" || args[0] == "owner") {
        return chatmsg(steamID, lang.settingscmdblockedvalues) 
    }

    var keyvalue = config[args[0]] //save old value to be able to reset changes

    //I'm not proud of this code but whatever -> used to convert array into usable array
    if (Array.isArray(keyvalue)) {
        let newarr = []

        args.forEach((e, i) => {
            if (i == 0) return; //skip args[0]
            if (i == 1) e = e.slice(1) //remove first char which is a [
            if (i == args.length - 1) e = e.slice(0, -1) //remove last char which is a ]

            e = e.replace(/,/g, "") //Remove ,
            if (e.startsWith('"')) newarr[i - 1] = String(e.replace(/"/g, ""))
                else newarr[i - 1] = Number(e) 
        })

        args[1] = newarr
    }

    //Convert to number or boolean as input is always a String
    if (typeof(keyvalue) == "number") args[1] = Number(args[1])
    if (typeof(keyvalue) == "boolean") { //prepare for stupid code because doing Boolean(value) will always return true
        if (args[1] == "true") args[1] = true
        if (args[1] == "false") args[1] = false //could have been worse tbh
    }

    //round maxComments value in order to avoid the possibility of weird amounts
    if (args[0] == "maxComments" || args[0] == "maxOwnerComments") args[1] = Math.round(args[1])

    if (keyvalue == undefined) return chatmsg(steamID, lang.settingscmdkeynotfound)
    if (keyvalue == args[1]) return chatmsg(steamID, lang.settingscmdsamevalue.replace("value", args[1]))

    config[args[0]] = args[1] //apply changes

    //32-bit integer limit check from controller.js's startup checks
    if (typeof(keyvalue) == "number" && config.commentdelay * config.maxComments > 2147483647 || typeof(keyvalue) == "number" && config.commentdelay * config.maxOwnerComments > 2147483647) { //check this here after the key has been set and reset the changes if it should be true
        config[args[0]] = keyvalue
        return chatmsg(steamID, lang.settingscmdvaluetoobig) //Just using the check from controller.js
    }

    chatmsg(steamID, lang.settingscmdvaluechanged.replace("targetkey", args[0]).replace("oldvalue", keyvalue).replace("newvalue", args[1]))
    logger("info", `${args[0]} has been changed from ${keyvalue} to ${args[1]}.`)

    if (args[0] == "playinggames") {
        logger("info", "Refreshing game status of all bot accounts...")
        Object.keys(controller.botobject).forEach((e, i) => {
            if (loginindex == 0) controller.botobject[i].gamesPlayed(config.playinggames); //set game only for the main bot
            if (loginindex != 0 && config.childaccsplaygames) controller.botobject[i].gamesPlayed(config.playinggames.slice(1, config.playinggames.length)) //play game with child bots but remove the custom game
        }) 
    }

    //Get arrays on one line
    var stringifiedconfig = JSON.stringify(config,function(k,v) { //Credit: https://stackoverflow.com/a/46217335/12934162
        if(v instanceof Array)
        return JSON.stringify(v);
        return v; 
    }, 4)
        .replace(/"\[/g, '[')
        .replace(/\]"/g, ']')
        .replace(/\\"/g, '"')
        .replace(/""/g, '""');

    fs.writeFile("./config.json", stringifiedconfig, err => {
        if (err) return logger("error", `write settings cmd changes to config error: ${err}`)
    })
}