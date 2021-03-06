/*
 * File: logger.js
 * Project: steam-comment-service-bot
 * Created Date: 09.07.2021 16:26:00
 * Author: 3urobeat
 * 
 * Last Modified: 05.10.2021 14:39:08
 * Modified By: 3urobeat
 * 
 * Copyright (c) 2021 3urobeat <https://github.com/HerrEurobeat>
 * 
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>. 
 */



/**
 * Logs text to the terminal and appends it to the output.txt file.
 * @param {String} type String that determines the type of the log message. Can be info, warn, error, debug or an empty string to not use the field.
 * @param {String} str The text to log into the terminal
 * @param {Boolean} nodate Setting to true will hide date and time in the message
 * @param {Boolean} remove Setting to true will remove this message with the next one
 */
module.exports.logger = (type, str, nodate, remove, animation) => { //Function that passes args to my logger library and just exists to handle readyafterlogs atm
    var outputlogger = require("output-logger") //look Mom, it's my own library!

    var controller   = require("../controller.js")


    //NOTE: If the amount of parameters of this function changes then the logger call for readyafterlogs in ready.js and the readyafterlogs.push() call below need to be updated!!


    //Configure my logging library (https://github.com/HerrEurobeat/output-logger#options-1)
    outputlogger.options({
        msgstructure: "[animation] [date | type] message",
        paramstructure: ["type", "str", "nodate", "remove", "animation"],
        outputfile: srcdir + "/../output.txt",
        animationdelay: 250
    })
    
    //Try to get readyafter or just ignore it if we can't. Previously I used checkAndGetFile() but that creates a circular dependency which I'd like to avoid
    try {
        var readyafter = require("../ready.js").readyafter;
    } catch (err) {
        var readyafter = null
    }

    //Push string to readyafterlogs if desired or print instantly
    if (!nodate && !remove && !readyafter && !str.toLowerCase().includes("error") && !str.includes('Logging in... Estimated wait time') && !str.includes("What's new:")) { //startup messages should have nodate enabled -> filter messages with date when bot is not started
        controller.readyafterlogs.push([ type, str, nodate, remove, animation ]);
    } else {
        outputlogger(type, str, nodate, remove, animation)
    }
}


/**
 * Returns one of the default animations
 * @param {String} animation Valid animations: `loading`, `waiting`, `bounce`, `progress`, `arrows` or `bouncearrows`
 * @returns Array of the chosen animation
 */
module.exports.logger.animation = (args) => {
    var outputlogger = require("output-logger")

    return outputlogger.animation(args)
}


/**
 * Stops any animation currently active
 */
module.exports.logger.stopAnimation = () => {
    var outputlogger = require("output-logger")

    return outputlogger.stopAnimation
}