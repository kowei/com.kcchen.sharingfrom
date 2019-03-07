#!/usr/bin/env node

/**
 * https://github.com/alunny/node-xcode/tree/master/test
 * 
 * see node_modules/xcode/pbxProject.js
 *     cordova/lib/projectFile.ks
 */
var fs = require('fs')

const lockPath = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/lock'

module.exports = function (context) {
    unlock()

    return

    function unlock() {
        if (fs.existsSync(lockPath)) {
            console.log('> unlock it... ')
            fs.unlinkSync(lockPath);
        }
    }
}
