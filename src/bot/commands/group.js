/*
 * File: group.js
 * Project: steam-comment-service-bot
 * Created Date: 09.07.2021 16:26:00
 * Author: 3urobeat
 * 
 * Last Modified: 29.09.2021 17:52:22
 * Modified By: 3urobeat
 * 
 * Copyright (c) 2021 3urobeat <https://github.com/HerrEurobeat>
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>. 
 */



/**
 * Runs the bot command
 * @param {SteamUser} bot The steam-user bot instance
 * @param {Function} chatmsg The chatmsg function
 * @param {Object} steamID The steamID object from steam-use
 * @param {Object} lang The language object
 */
module.exports.group = (bot, chatmsg, steamID, lang) => {
    var SteamID         = require("steamid")

    var mainfile        = require("../main.js")


    if (config.yourgroup.length < 1 || !mainfile.configgroup64id) return chatmsg(steamID, lang.groupcmdnolink) //no group info at all? stop.

    if (mainfile.configgroup64id && Object.keys(bot.myGroups).includes(mainfile.configgroup64id)) { 
        bot.inviteToGroup(steamID, mainfile.configgroup64id); chatmsg(steamID, lang.groupcmdinvitesent); 
        
        if (mainfile.configgroup64id != "103582791464712227") { //https://steamcommunity.com/groups/3urobeatGroup
        bot.inviteToGroup(steamID, new SteamID("103582791464712227")); } 
        return; } //id? send invite and stop

    chatmsg(steamID, lang.groupcmdinvitelink + config.yourgroup) //seems like no id has been saved but an url. Send the user the url
}


/**
 * Runs the leavegroup command
 * @param {Function} chatmsg The chatmsg function
 * @param {Object} steamID The steamID object from steam-use
 * @param {Object} lang The language object
 * @param {Array} args The args array
 */
module.exports.leaveGroup = (chatmsg, steamID, lang, args) => {
    var steamidresolver = require("steamid-resolver")
    var SteamID         = require("steamid")

    var controller      = require("../../controller/controller.js")


    if (isNaN(args[0]) && !String(args[0]).startsWith('https://steamcommunity.com/groups/')) return chatmsg(steamID, lang.leavegroupcmdinvalidgroup)

    if (String(args[0]).startsWith('https://steamcommunity.com/groups/')) {
        steamidresolver.groupUrlToGroupID64(args[0], (err, leavegroupResult) => {
            if (err == "The specified group could not be found.") { //if the group couldn't be found display specific message
                return chatmsg(steamID, lang.leavegroupcmdnotfound)
            } else {
                if (err) chatmsg(steamID, lang.leavegroupcmderror + err) //if a different error then display a generic message with the error
            }

            logger("info", `Successfully retrieved leavegroup information. groupID64: ${leavegroupResult}`, false, true)

            args[0] = leavegroupResult
            startleavegroup()
        })

    } else { 
        startleavegroup() 
    }

    function startleavegroup() { //eslint-disable-line no-inner-declarations, no-case-declarations
        var argsSteamID = new SteamID(String(args[0]))
        if (argsSteamID.isValid() === false || argsSteamID["type"] !== 7) return chatmsg(steamID, lang.leavegroupcmdinvalidgroup)

        Object.keys(controller.botobject).forEach((i) => {
            setTimeout(() => {
                if (controller.botobject[i].myGroups[argsSteamID] === 3) controller.communityobject[i].leaveGroup(argsSteamID)
            }, 1000 * i); //delay every iteration so that we don't make a ton of requests at once
        })

        chatmsg(steamID, lang.leavegroupcmdsuccess.replace("profileid", args[0]))
        logger("info", `Left group ${args[0]} with all bot accounts.`)
    }
}


/**
 * Runs the leaveallgroups command
 * @param {Function} chatmsg The chatmsg function
 * @param {Object} steamID The steamID object from steam-use
 * @param {Object} lang The language object
 * @param {Array} args The args array
 */
module.exports.leaveAllGroups = (chatmsg, steamID, lang, args) => {
    var controller      = require("../../controller/controller.js")
    var cachefile       = require("../../data/cache.json")
    var mainfile        = require("../main.js")

    var abortleaveallgroups;


    if (args[0] == "abort") { 
        chatmsg(steamID, lang.leaveallgroupscmdabort); 
        return abortleaveallgroups = true; 
    }

    abortleaveallgroups = false
    chatmsg(steamID, lang.leaveallgroupscmdpending)

    setTimeout(() => {
        if (abortleaveallgroups) return logger("info", "leaveallgroups process was aborted.");
        chatmsg(steamID, lang.leaveallgroupscmdstart)
        logger("info", "Starting to leave all groups...")

        for (let i in controller.botobject) {
            for (let group in controller.botobject[i].myGroups) {
                try {
                    setTimeout(() => {
                        if (controller.botobject[i].myGroups[group] == 3) {
                            if (group != cachefile.botsgroupid && group != mainfile.configgroup64id) controller.communityobject[i].leaveGroup(String(group)) 
                        }
                    }, 1000 * i); //delay every iteration so that we don't make a ton of requests at once
                } catch (err) {
                    logger("error", `[Bot ${i}] leaveallgroups error leaving ${group}: ${err}`)
                }
            }
        }
    }, 15000);
}