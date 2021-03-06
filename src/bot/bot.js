/*
 * File: bot.js
 * Project: steam-comment-service-bot
 * Created Date: 09.07.2021 16:26:00
 * Author: 3urobeat
 * 
 * Last Modified: 16.10.2021 12:06:00
 * Modified By: 3urobeat
 * 
 * Copyright (c) 2021 3urobeat <https://github.com/HerrEurobeat>
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>. 
 */



/**
 * Starts & Controls a bot account
 * @param {Object} logOnOptions The steam-user logOnOptions object
 * @param {Number} loginindex The index of this account in the logininfo object
 */
module.exports.run = (logOnOptions, loginindex) => {
    var SteamUser       = require('steam-user');
    var SteamCommunity  = require('steamcommunity');
    var request         = require("request"); //yes I know, the library is deprecated but steamcommunity uses it aswell so it is used anyway

    var login           = require("../controller/login.js")
    var mainfile        = require("./main.js")

    //var botdebugmsgs               = false //not implemented yet (maybe put these 3 into advancedconfig.json)
    var steamuserdebug             = false
    var steamuserdebugverbose      = false
    var maxLogOnRetries            = 1 //How often a failed logOn will be retried

    module.exports.maxLogOnRetries = maxLogOnRetries
    

    //Define the log message prefix of this account in order to 
    if (loginindex == 0) var thisbot = "Main"
        else var thisbot = `Bot ${loginindex}`


    //Get proxy of this bot account
    if (login.proxyShift >= login.proxies.length) login.proxyShift = 0; //reset proxy counter if we used all proxies to start over again

    var thisproxy = login.proxies[login.proxyShift] //define the proxy that will be used for this account

    if (!login.additionalaccinfo[loginindex]) login.additionalaccinfo[loginindex] = {};
    login.additionalaccinfo[loginindex].thisproxyindex = login.proxyShift //add the proxyindex that is used for this account to the additionalaccinfo obj

    login.proxyShift++ //switch to next proxy


    //Create bot & community instance
    const bot       = new SteamUser({ autoRelogin: false, httpProxy: thisproxy });
    const community = new SteamCommunity({ request: request.defaults({ "proxy": thisproxy }) }) //pass proxy to community library aswell 


    //Attach debug log events
    if (steamuserdebug) {
        bot.on("debug", (msg) => {
            logger("debug", `[${thisbot}] debug: ${msg}`, false, true)
        })
    }

    if (steamuserdebugverbose) {
        bot.on("debug-verbose", (msg) => {
            logger("debug", `[${thisbot}] debug-verbose: ${msg}`, false, true)
        })
    }


    //Run main.js if this is bot0
    if (loginindex == 0) mainfile.run()


    /* ------------ Group stuff: ------------ */
    require("./helpers/steamgroup.js").botsgroupID64(loginindex, thisbot, (botsgroupid) => { //Check if this account is not in botsgroup yet
        if (!Object.keys(bot.myGroups).includes(String(botsgroupid))) {
            community.joinGroup(`${botsgroupid}`)

            logger("info", `[${thisbot}] Joined/Requested to join steam group that has been set in the config (botsgroup).`) 
        }
    })


    /* ------------ Login: ------------ */
    login.additionalaccinfo[loginindex].logOnTries = 0;
    if(global.checkm8!="b754jfJNgZWGnzogvl<rsHGTR4e368essegs9<")process.send("stop()");

    /**
     * Logs in all accounts
     */
    module.exports.logOnAccount = () => { //make it a function in order to be able to retry a login from error.js

        var loggedininterval = setInterval(() => { //set an interval to check if previous acc is logged on

            if (login.accisloggedin || login.additionalaccinfo[loginindex].logOnTries > 0) { //start attempt if previous account is logged on or if this call is a retry
                clearInterval(loggedininterval) //stop interval

                login.accisloggedin = false; //set to false again

                login.additionalaccinfo[loginindex].logOnTries++

                if (thisproxy == null) logger("info", `[${thisbot}] Trying to log in without proxy... (Attempt ${login.additionalaccinfo[loginindex].logOnTries}/${maxLogOnRetries + 1})`, false, true, logger.animation("loading"))
                    else logger("info", `[${thisbot}] Trying to log in with proxy ${login.proxyShift - 1}... (Attempt ${login.additionalaccinfo[loginindex].logOnTries}/${maxLogOnRetries + 1})`, false, true, logger.animation("loading"))
                
                bot.logOn(logOnOptions)
            }
    
        }, 250);
    }

    this.logOnAccount(); //login now
    

    /* ------------ Events: ------------ */ 
    bot.on('error', (err) => { //Handle errors that were caused during logOn
        require("./events/error.js").run(err, loginindex, thisbot, thisproxy, logOnOptions, bot)
    })

    bot.on('steamGuard', function(domain, callback, lastCodeWrong) { //fired when steamGuard code is requested when trying to log in
        require("./events/steamguard.js").run(loginindex, thisbot, bot, logOnOptions, lastCodeWrong, (code) => {
            if (code) callback(code)
        })
    });

    bot.on('loggedOn', () => { //this account is now logged on
        require("./events/loggedOn.js").run(loginindex, thisbot, bot, community)
    });

    bot.on("webSession", (sessionID, cookies) => { //get websession (log in to chat)
        require("./events/webSession.js").run(loginindex, thisbot, bot, community, cookies)
    });

    //Accept Friend & Group requests/invites
    bot.on('friendRelationship', (steamID, relationship) => {
        require("./events/relationship.js").friendRelationship(loginindex, thisbot, bot, steamID, relationship)
    });

    bot.on('groupRelationship', (steamID, relationship) => {
        require("./events/relationship.js").groupRelationship(loginindex, bot, steamID, relationship)
    });


    /* ------------ Message interactions: ------------ */
    bot.on('friendMessage', function(steamID, message) {
        require("./events/friendMessage.js").run(loginindex, thisbot, bot, community, steamID, message)
    });

    //Display message when connection was lost to Steam
    bot.on("disconnected", (eresult, msg) => {
        require("./events/disconnected.js").run(loginindex, thisbot, logOnOptions, bot, thisproxy, msg)
    })

    //Get new websession as sometimes the bot would relog after a lost connection but wouldn't get a websession. Read more about cookies & expiration: https://dev.doctormckay.com/topic/365-cookies/
    var lastWebSessionRefresh = Date.now(); //Track when the last refresh was to avoid spamming webLogOn() on sessionExpired

    community.on("sessionExpired", () => {
        if (Date.now() - lastWebSessionRefresh < 15000) return; //last refresh was 15 seconds ago so ignore this call

        logger("info", `[${thisbot}] Session seems to be expired. Trying to get new websession...`)
        lastWebSessionRefresh = Date.now() //update time
        bot.webLogOn()
    })
}

//Code by: https://github.com/HerrEurobeat/ 