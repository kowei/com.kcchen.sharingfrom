#!/usr/bin/env node

/**
 * https://github.com/alunny/node-xcode/tree/master/test
 * 
 * see node_modules/xcode/pbxProject.js
 *     cordova/lib/projectFile.ks
 */
var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    xcode = require('xcode'),
    plist = require('plist'),
    _ = require('underscore'),
    util = require('util'),
    xcconfig;
const swiftVersion = "3.0",
    swiftPattern = /([\s\S]*)(SWIFT_VERSION)[\s|\t]*=[\s|\t]*([0-9|\.]*)([\s\S]*)/,
    swiftOldPattern = /([\s\S]*)(SWIFT_OLD_VERSION)[\s|\t]*=[\s|\t]*([0-9|\.]*)([\s\S]*)/,
    teamPattern = /([\s\S]*)(DEVELOPMENT_TEAM)[\s|\t]*=[\s|\t]*([A-Z|0-9]*)([\s\S]*)/,
    encoding = 'utf-8',
    filepath = 'platforms/ios/cordova/build.xcconfig',
    patchProjectFile = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/projectFile.js.patch',
    patchPbxProject = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/pbxProject.js.patch';

module.exports = function (context) {




    console.log('> check ios... ' + (context.opts.cordova.platforms.indexOf('ios') != -1))
    if (context.opts.cordova.platforms.indexOf('ios') === -1) return;



    console.log('######################### AFTER PLUGIN INSTALL #########################')


    if (openXcConfig()) {
        addSwiftVersion();
        addDevelopmentTeam();
        fs.writeFileSync(filepath, xcconfig, encoding);
    }


    console.log('-------------------- AFTER PLUGIN INSTALL FINISHED  --------------------')

    return







    function openXcConfig() {
        try {
            xcconfig = fs.readFileSync(filepath, encoding);
            console.log("> check filepath [" + filepath + "]... " + !(!xcconfig))
        } catch (e) {
            console.error("> check filepath [" + filepath + "]... NOT EXISTED.")
            console.error(e)
            return
        }
        return !(!xcconfig);
    }

    function addSwiftVersion() {

        xcconfig = xcconfig.replace(/^\s*[\r\n]/gm, '\n')
        var matches = xcconfig.match(swiftPattern)
        if (matches) {
            printRegEx(matches)
            console.log('> check SWIFT_VERSION... ' + ((swiftVersion > matches[3]) ? "use " + swiftVersion + " instead of " + matches[3] : "use current " + matches[3]))
            // set SWIFT_VERSION, replace new
            if (swiftVersion > matches[3]) {
                var matchesOld = xcconfig.match(swiftOldPattern)
                if (matchesOld) {
                    xcconfig =
                        matches[1] +
                        matches[2] +
                        " = " +
                        swiftVersion +
                        matches[4]
                    matchesOld = xcconfig.match(swiftOldPattern)
                    console.log('> replace SWIFT_VERSION... ' + matches[2] + " = " + swiftVersion)
                    printRegEx(matchesOld)
                    xcconfig =
                        matchesOld[1] +
                        matchesOld[2] +
                        " = " +
                        matches[3] +
                        matchesOld[4]
                    console.log('> replace SWIFT_OLD_VERSION... ' + matchesOld[2] + " = " + matches[3])
                } else {
                    // not set SWIFT_OLD_VERSION, add new
                    xcconfig =
                        matches[1] +
                        'SWIFT_OLD_VERSION' +
                        " = " +
                        matches[3] +
                        "\n" +
                        matches[2] +
                        " = " +
                        swiftVersion +
                        matches[4]

                    console.log('> replace SWIFT_VERSION SWIFT_OLD_VERSION... ' + 'SWIFT_OLD_VERSION' +
                        " = " +
                        matches[3] +
                        "\n" +
                        matches[2] +
                        " = " +
                        swiftVersion)
                }
            } else {
                // that's what we need
                console.log('> NO CHANGES, use current version... ' + matches[3])
            }
        } else {
            // not set SWIFT_VERSION, add new
            xcconfig += '\n' + 'SWIFT_OLD_VERSION' + ' = ' + swiftVersion;
            xcconfig += '\n' + "SWIFT_VERSION" + ' = ' + swiftVersion;
            console.log('@ SET  SWIFT_VERSION = ' + swiftVersion)
        }
    }

    function addDevelopmentTeam() {
        try {
            buildJSON = require('./codeSign.json');
            if (buildJSON.team) {
                var matches = xcconfig.match(teamPattern)
                if (!matches) {
                    // xcconfig += '\n' + 'DEVELOPMENT_OLD_TEAM' + ' = ' + buildJSON.team;
                    xcconfig += '\n' + 'DEVELOPMENT_TEAM' + ' = ' + buildJSON.team;
                    console.log('@ SET  DEVELOPMENT_TEAM = ' + buildJSON.team)
                } else {
                    if (buildJSON.team === matches[3]) {
                        console.log('> use current DEVELOPMENT_TEAM... ' + buildJSON.team)
                    } else {
                        xcconfig =
                            matches[1] +
                            matches[2] +
                            " = " +
                            buildJSON.team +
                            matches[4]
                        console.log('> use new DEVELOPMENT_TEAM... ' + buildJSON.team + " instead of " + matches[3])
                    }
                }
            }
        } catch (ex) {
            console.error('\nThere was an error fetching your ../../build.json file.');
        }
    }

    function printRegEx(matches) {
        console.log('  -> matches: ' + matches.length)
        matches.forEach(function (element) {
            if (element) {
                if (element.length < 30) {
                    console.log('  -> matches element... ' + element)
                } else {
                    var short = element.substring(0, 30)
                    short.match(/(^[\s\S]*$)\n/m)
                    console.log('  -> matches element... ' + short.replace('/[\n|\r]+/', '                        \n'))
                }
            } else {
                console.log('  -> matches element... null')
            }
        }, this);
    }
};
