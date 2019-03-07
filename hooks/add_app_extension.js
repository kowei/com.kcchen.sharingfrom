#!/usr/bin/env node

/**
 * https://github.com/alunny/node-xcode/tree/master/test
 * 
 * see node_modules/xcode/pbxProject.js
 *     cordova/lib/projectFile.ks
 */
var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec
var pbxFile = require('./pbxFile')
var xcode = require('xcode')
var plist = require('plist')
var _ = require('underscore')
var util = require('util')
const encoding = 'utf-8'
const COMMENT_KEY = /_comment$/
const pbxProjectInitBackup = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/project.init.pbxproj'
const pbxProjectInitExtensionBackup = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/project.extention.pbxproj'
const pbxProjectPatch = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/project.pbxproj.patch'
const patchProjectFile = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/projectFile.js.patch'
const patchPbxProject = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/pbxProject.js.patch'
const lockPath = './custom_plugins/com.kcchen.sharingfrom/hooks/patches/lock'
// const extensionName = "SharingFrom"
const namePattern = /[\s\S]*PBXProject[\s|\t]*\"(.*)\"/
const resourceFiles = [
    'MainInterface.storyboard'
]
const sourceFiles = [
    'com.kcchen.sharingfrom/ShareViewController.swift'
]
const sep = '--------------------------------------------------------------------------------------------------------------------\n'
var xcBuildConfiguration
var pbx
var plistValue
var f = util.format
var projectName
var projectId
var projects
var pbxPath
var xcodeproj
var codeSignJSON
var extensionName
var nativeTarget
var targetId
var extensionSourceBuildPhase
var extensionResourceBuildPhase

// const provisionProfile = {
//     'team': 'RSYCQ2AB6W',
//     'drawingapp2': {
//         'Debug': {
//             'CODE_SIGN_IDENTITY': '"iPhone Developer: KC Chen (R5RX947SRH)"',
//             'PROVISIONING_PROFILE': '"b226a500-080c-4d5c-8347-bc359afb61ae"',
//             'PROVISIONING_PROFILE_SPECIFIER': '"iOS Development DrawingApp2"'
//         },
//         'Release': {
//             'CODE_SIGN_IDENTITY': '"iPhone Distribution: KYE SYSTEMS CORP. (RSYCQ2AB6W)"',
//             'PROVISIONING_PROFILE': '"3e5913ec-e89e-44be-85e1-1a86ec35901e"',
//             'PROVISIONING_PROFILE_SPECIFIER': '"iOS Distribution DrawingApp2"'
//         }
//     },
//     'SharingFrom': {
//         'Debug': {
//             'CODE_SIGN_IDENTITY': '"iPhone Developer: KC Chen (R5RX947SRH)"',
//             'PROVISIONING_PROFILE': '"d6352194-3000-4c54-8436-84d3b0fe427f"',
//             'PROVISIONING_PROFILE_SPECIFIER': '"iOS Development DrawingApp2 All"'
//         },
//         'Release': {
//             'CODE_SIGN_IDENTITY': '"iPhone Distribution: KYE SYSTEMS CORP. (RSYCQ2AB6W)"',
//             'PROVISIONING_PROFILE': '"8292399f-ba72-4c1f-bdaa-6b14a91beeea"',
//             'PROVISIONING_PROFILE_SPECIFIER': '"iOS Distribution DrawingApp2 All"'
//         }
//     }
// }

module.exports = function (context) {
    // console.log('> check ios... ' + (context.opts.cordova.platforms.indexOf('ios') !== -1))
    if (context.opts.cordova.platforms.indexOf('ios') === -1) return;

    console.log('######################### ADD EXTENSION #########################')

    if (lock()) {
        if (prepare()) {
            if (!findTarget(xcBuildConfiguration, extensionName)) {
                console.log('> entension ' + extensionName + ' not found. adding... ')
                addExtension(xcBuildConfiguration, projectId, projectName);
                write();
            } else {
                console.log('> entension is already existed. ')
            }
        }
        unlock()
    } else {
        console.error('> ANOTHER PROCESS RUNNING...')
        return
    }

    console.log('------------------------- ADD EXTENSION  -------------------------')

    return

    function lock() {
        try {
            var isLock = fs.existsSync(lockPath);
            // console.log('> check lock existed... ' + isLock)
            if (!isLock) {
                fs.writeFileSync(lockPath, '');
                // console.log('> lock it... ')
            }

            return !isLock
        } catch (e) {
            console.log(e)
        }
        return false
    }

    function unlock() {
        if (fs.existsSync(lockPath)) {
            // console.log('> unlock it... ')
            fs.unlinkSync(lockPath);
        }
    }

    function write() {
        var data = xcodeproj.writeSync()
        Promise.resolve()
            .then(() => {
                fs.writeFileSync(pbxPath, data);
                return Promise.resolve()
            })
            .then(() => {
                fs.writeFileSync(pbxProjectInitExtensionBackup, data);
                return Promise.resolve()
            })
            .then(() => {
                exec(
                    'diff -Nau ' + pbxProjectInitBackup + ' ' + pbxProjectInitExtensionBackup + ' > ' + pbxProjectPatch,
                    function (error, stdout, stderr) {
                        console.log('> error ' + error)
                        console.log('> stdout ' + stdout)
                        console.log('> stderr ' + stderr)
                        // console.log('> make diff for project.pbxproj after add app-extension... ');
                    })
                return Promise.resolve()
            })
            .catch((e) => {
                console.log('> catch error:' + e)
            })
    }

    function openXcodeProj() {
        if (!pbxPath) pbxPath = getXcodeProjectPath(context)
        if (!pbxPath) return false
        // console.log('> get Project Path... ' + pbxPath);
        xcodeproj = xcode.project(pbxPath);
        xcodeproj.parseSync();
        return true
    }

    function openCodeSignJSON() {
        try {
            codeSignJSON = require('./codeSign.json');
            // console.log('> check codeSign.json ... ' + !(!codeSignJSON))
            extensionName = codeSignJSON.extension.name
        } catch (e) {
            console.error('> check codeSign.json ... NOT EXISTED.')
            console.error(e)
            return false
        }
        return !(!codeSignJSON);
    }

    function saveXcodeproj(path) {
        if (!pbxPath) pbxPath = getXcodeProjectPath()
        pbx = fs.readFileSync(pbxPath, encoding);
        fs.writeFileSync(path, pbx, encoding);
        console.log('> SAVE ' + path + '... ' + !(!pbx))
    }

    function prepare() {
        if (!openXcodeProj()) return false;
        if (!openCodeSignJSON()) return false;

        try {
            saveXcodeproj(pbxProjectInitBackup)

            xcBuildConfiguration = xcodeproj.pbxXCBuildConfigurationSection()
            nativeTarget = xcodeproj.pbxNativeTargetSection()
            projects = xcodeproj.pbxProjectSection()
        } catch (e) {
            console.log('> check filepath... ' + pbxPath + ' not existed.')
            console.error(e)
            return false
        }

        if (_.size(projects) / 2 === 1) {
            projectName = xcodeproj.getFirstTarget().firstTarget.name.replace(/"/g, '')
            targetId = xcodeproj.getFirstTarget().firstTarget.buildConfigurationList
            projectId = _.keys(projects)[0]
            console.log('> get Project Name... ' + projectName)
            console.log('> get Project ID... ' + projectId)
            console.log('> get Target ID... ' + targetId)
        } else {
            throw new Error('The project and target not only ONE, currently no support for multiple projects.');
        }
        return true
    }

    function findTarget(xcBuildConfiguration, extensionName) {
        var isFound = false;
        _.filter(
            xcBuildConfiguration,
            function (entry, id, context) {
                if (!entry.buildSettings || !entry.buildSettings.PRODUCT_NAME) return
                if (entry.buildSettings.PRODUCT_NAME.indexOf(extensionName) !== -1) {
                    isFound = true
                }
            }
        )
        return isFound;
    }

    function addExtension(xcBuildConfiguration, projectId, projectName) {
        var
            pbxXCConfigurationList = xcodeproj.pbxXCConfigurationList()
        try {
            projects[projectId].buildConfigurationList_comment = projects[projectId].buildConfigurationList_comment.replace('__NON-CLI__', projectName)
            console.log('> update __NON-CLI__...' + projects[projectId].buildConfigurationList_comment);

            var commentKey = f('%s_comment', projects[projectId].buildConfigurationList);
            pbxXCConfigurationList[commentKey] = pbxXCConfigurationList[commentKey].replace('__NON-CLI__', projectName)
            console.log('> update __NON-CLI__...' + pbxXCConfigurationList[commentKey]);
        } catch (e) {
            throw new Error('Replace __NON-CLI__ failed');
        }

        var newTarget = addTarget(xcodeproj, extensionName, 'app_extension', extensionName)
        console.log('> add new target for app extension...');
        // console.log(newTarget);

        if (newTarget) {
            /* return { uuid: buildPhaseUuid, buildPhase: buildPhase }; */

            extensionSourceBuildPhase = addBuildPhase(
                sourceFiles,
                'PBXSourcesBuildPhase',
                'Sources',
                newTarget.uuid, {},
                ''
            )
            console.log('> get Source Phase UUID... ' + extensionSourceBuildPhase.uuid)
            // console.log(extensionSourceBuildPhase.buildPhase)
            console.log(sep)

            extensionResourceBuildPhase = addBuildPhase(
                resourceFiles,
                'PBXResourcesBuildPhase',
                'Resources',
                newTarget.uuid, {},
                ''
            )

            console.log('> get Resources Phase UUID... ' + extensionResourceBuildPhase.uuid)
            // console.log(extensionResourceBuildPhase.buildPhase)
            console.log(sep)

            addExtensionBuildFlag()
            addTargetDependencyTo(extensionName, 'CordovaLib')
            addExtensionManualSigining();
        } else {
            console.log('> add new target for app extension failed');
        }

        try {
            replacePlist(xcodeproj, xcBuildConfiguration);
        } catch (e) {
            console.error(e)
        }
    }

    function addExtensionManualSigining() {
        _.filter(
            xcodeproj.hash.project.objects['XCBuildConfiguration'],
            function (entry, id, context) {
                if (!entry.buildSettings || !entry.buildSettings.PRODUCT_NAME) return
                for (var target in codeSignJSON) {
                    if (!codeSignJSON[target].name && codeSignJSON[target].name !== 'extension') continue
                    for (var build in codeSignJSON[target]) {
                        if (entry.buildSettings.PRODUCT_NAME.indexOf(codeSignJSON[target].name) !== -1 && entry.name.indexOf(build) !== -1) {
                            // for (var item in codeSignJSON[target][build]) {
                            //     xcodeproj.hash.project.objects['XCBuildConfiguration'][id].buildSettings[item] = codeSignJSON[target][build][item]
                            //     console.log('> add ' + item + ' : ' + codeSignJSON[target][build][item] + ' to ' + target + ' / ' + build)
                            // }
                            xcodeproj.hash.project.objects['XCBuildConfiguration'][id].buildSettings['DEVELOPMENT_TEAM'] = codeSignJSON.team
                        }
                    }
                }
            }
        )

        for (var project in projects) {
            if (!projects[project].targets) continue
            for (var target of projects[project].targets) {
                if (!projects[project].attributes) {
                    projects[project]['attributes'] = {}
                }
                if (!projects[project].attributes['TargetAttributes']) {
                    projects[project].attributes['TargetAttributes'] = {}
                }
                if (!projects[project].attributes['TargetAttributes'][target.value]) {
                    projects[project].attributes['TargetAttributes'][target.value] = {}
                }
                if (target.comment.indexOf(codeSignJSON['extension'].name) !== -1) {
                    projects[project].attributes['TargetAttributes'][target.value]['DevelopmentTeam'] = codeSignJSON.team
                    projects[project].attributes['TargetAttributes'][target.value]['ProvisioningStyle'] = 'Manual'
                    console.log('> add Manual Signing to ' + target.value)
                }
            }
        }
        console.log(sep)
    }

    function addExtensionBuildFlag() {
        _.filter(
            xcodeproj.hash.project.objects['XCBuildConfiguration'],
            function (entry, id, context) {
                if (!entry.buildSettings || !entry.buildSettings.PRODUCT_NAME) return
                if (entry.buildSettings.PRODUCT_NAME.indexOf(projectName) !== -1 || entry.buildSettings.PRODUCT_NAME.indexOf(extensionName) !== -1) {
                    entry.buildSettings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = 'YES'
                    entry.buildSettings.ALWAYS_SEARCH_USER_PATHS = 'YES'
                }
            }
        )
    }

    // helper addition functions
    function addToPbxBuildFileSection(file) {
        var commentKey = f('%s_comment', file.uuid);

        xcodeproj.pbxBuildFileSection()[file.uuid] = pbxBuildFileObj(file);
        xcodeproj.pbxBuildFileSection()[commentKey] = pbxBuildFileComment(file).replace(/[\"|\']/g, '');
        console.log('> add ' + file.uuid + ' to PBXBuildFile section...')
        console.log(xcodeproj.pbxBuildFileSection()[file.uuid])
        console.log('> add ' + file.uuid + ' commentKey to PBXBuildFile section...')
        console.log(xcodeproj.pbxBuildFileSection()[commentKey])
    }
    // helper object creation functions
    function pbxBuildFileObj(file) {
        var obj = Object.create(null);

        obj.isa = 'PBXBuildFile';
        obj.fileRef = file.fileRef;
        obj.fileRef_comment = file.basename;
        if (file.settings) obj.settings = file.settings;

        return obj;
    }

    function pbxBuildFileComment(file) {
        return longComment(file);
    }

    function pbxFileReferenceObj(file) {
        var fileObject = {
            isa: 'PBXFileReference',
            name: '"' + file.basename + '"',
            path: '"' + file.path.replace(/\\/g, '/') + '"',
            sourceTree: file.sourceTree,
            fileEncoding: file.fileEncoding,
            lastKnownFileType: file.lastKnownFileType,
            explicitFileType: file.explicitFileType,
            includeInIndex: file.includeInIndex
        };

        return fileObject;
    }

    function addTarget(xcodeproj, name, type, subfolder) {

        // Setup uuid and name of new target
        var targetUuid = xcodeproj.generateUuid()
        var targetType = type
        var targetSubfolder = subfolder || name
        var targetName = name.trim()

        // Check type against list of allowed target types
        if (!targetName) {
            throw new Error('Target name missing.');
        }

        // Check type against list of allowed target types
        if (!targetType) {
            throw new Error('Target type missing.');
        }

        // Check type against list of allowed target types
        if (!producttypeForTargettype(targetType)) {
            throw new Error('Target type invalid: ' + targetType);
        }

        // Build Configuration: Create
        var buildConfigurationsList = [{
            name: 'Debug',
            isa: 'XCBuildConfiguration',
            buildSettings: {
                GCC_PREPROCESSOR_DEFINITIONS: ['"DEBUG=1"', '"$(inherited)"'],
                INFOPLIST_FILE: '"' + path.join(targetSubfolder, targetSubfolder + '-Info.plist' + '"'),
                LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
                PRODUCT_NAME: '"' + targetName + '"',
                SKIP_INSTALL: 'YES'
            }
        },
        {
            name: 'Release',
            isa: 'XCBuildConfiguration',
            buildSettings: {
                INFOPLIST_FILE: '"' + path.join(targetSubfolder, targetSubfolder + '-Info.plist' + '"'),
                LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
                PRODUCT_NAME: '"' + targetName + '"',
                SKIP_INSTALL: 'YES'
            }
        }
        ];

        // Build Configuration: Add
        var buildConfigurations = xcodeproj.addXCConfigurationList(buildConfigurationsList, 'Release', 'Build configuration list for PBXNativeTarget "' + targetName + '"');

        // Product: Create
        console.log('> get productFile...')

        var productName = targetName
        console.log('> get productName...' + productName)
        var productType = producttypeForTargettype(targetType)
        console.log('> get productType...' + productType)
        var productFileType = filetypeForProducttype(productType).replace(/["|']/g, '')
        console.log('> get productFileType...' + productFileType)
        var productFile = addProductFile(
            productName, {
                group: 'Copy Files',
                'target': targetUuid,
                'explicitFileType': productFileType
            }
        )
        var productFileName = productFile.basename
        console.log('> get productFileName...' + productFileName)

        // console.log(productFile)
        console.log(sep)
        // Product: Add to build file list
        xcodeproj.addToPbxBuildFileSection(productFile);

        // Target: Create
        var target = {
            uuid: targetUuid,
            pbxNativeTarget: {
                isa: 'PBXNativeTarget',
                name: '"' + targetName + '"',
                productName: '"' + targetName + '"',
                productReference: productFile.fileRef,
                productType: '"' + producttypeForTargettype(targetType) + '"',
                buildConfigurationList: buildConfigurations.uuid,
                buildPhases: [],
                buildRules: [],
                dependencies: []
            }
        };

        // Target: Add to PBXNativeTarget section
        xcodeproj.addToPbxNativeTargetSection(target)

        // Product: Embed (only for "extension"-type targets)
        if (targetType === 'app_extension') {

            // Create CopyFiles phase in first target
            addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Copy Files', xcodeproj.getFirstTarget().uuid, targetType)

            // Add product to CopyFiles phase
            xcodeproj.addToPbxCopyfilesBuildPhase(productFile)

            // this.addBuildPhaseToTarget(newPhase.buildPhase, this.getFirstTarget().uuid)

        };

        // Target: Add uuid to root project
        xcodeproj.addToPbxProjectSection(target);

        // Target: Add dependency for this target to first (main) target
        xcodeproj.addTargetDependency(xcodeproj.getFirstTarget().uuid, [target.uuid]);


        // Return target on success
        return target;

    };

    function addBuildPhase(filePathsArray, buildPhaseType, comment, target, optionsOrFolderType, subfolderPath) {
        var buildPhaseSection,
            fileReferenceSection = xcodeproj.pbxFileReferenceSection(),
            buildFileSection = xcodeproj.pbxBuildFileSection(),
            buildPhaseUuid = xcodeproj.generateUuid(),
            buildPhaseTargetUuid = target || xcodeproj.getFirstTarget().uuid,
            commentKey = f("%s_comment", buildPhaseUuid),
            buildPhase = {
                isa: buildPhaseType,
                buildActionMask: 2147483647,
                files: [],
                runOnlyForDeploymentPostprocessing: 0
            },
            filePathToBuildFile = {};

        if (buildPhaseType === 'PBXCopyFilesBuildPhase') {
            buildPhase = pbxCopyFilesBuildPhaseObj(buildPhase, optionsOrFolderType, subfolderPath, comment);
        } else if (buildPhaseType === 'PBXShellScriptBuildPhase') {
            buildPhase = pbxShellScriptBuildPhaseObj(buildPhase, optionsOrFolderType, comment)
        }

        if (!xcodeproj.hash.project.objects[buildPhaseType]) {
            xcodeproj.hash.project.objects[buildPhaseType] = new Object();
        }

        if (!xcodeproj.hash.project.objects[buildPhaseType][buildPhaseUuid]) {
            xcodeproj.hash.project.objects[buildPhaseType][buildPhaseUuid] = buildPhase;
            xcodeproj.hash.project.objects[buildPhaseType][commentKey] = comment;
        }

        if (xcodeproj.hash.project.objects['PBXNativeTarget'][buildPhaseTargetUuid]['buildPhases']) {
            xcodeproj.hash.project.objects['PBXNativeTarget'][buildPhaseTargetUuid]['buildPhases'].push({
                value: buildPhaseUuid,
                comment: comment
            })

        }


        for (var key in buildFileSection) {
            // only look for comments
            if (!COMMENT_KEY.test(key)) continue;

            var buildFileKey = key.split(COMMENT_KEY)[0],
                buildFile = buildFileSection[buildFileKey];
            fileReference = fileReferenceSection[buildFile.fileRef];

            if (!fileReference) continue;

            var pbxFileObj = new pbxFile(fileReference.path);

            filePathToBuildFile[fileReference.path] = {
                uuid: buildFileKey,
                basename: pbxFileObj.basename,
                group: pbxFileObj.group
            };
        }

        for (var index = 0; index < filePathsArray.length; index++) {
            var filePath = filePathsArray[index],
                filePathQuoted = "\"" + filePath + "\"",
                file = new pbxFile(filePath, {});

            if (filePathToBuildFile[filePath]) {
                console.log("> get buildPhase file... " + filePath)
                buildPhase.files.push(pbxBuildPhaseObj(filePathToBuildFile[filePath]));
                continue;
            } else if (filePathToBuildFile[filePathQuoted]) {
                console.log("> get buildPhase file... " + filePathQuoted)
                buildPhase.files.push(pbxBuildPhaseObj(filePathToBuildFile[filePathQuoted]));
                continue;
            }

            file.uuid = xcodeproj.generateUuid();
            file.fileRef = xcodeproj.generateUuid();
            xcodeproj.addToPbxFileReferenceSection(file); // PBXFileReference
            xcodeproj.addToPbxBuildFileSection(file); // PBXBuildFile
            buildPhase.files.push(pbxBuildPhaseObj(file));
        }

        if (buildPhaseSection) {
            buildPhaseSection[buildPhaseUuid] = buildPhase;
            buildPhaseSection[commentKey] = comment;
        }

        return {
            uuid: buildPhaseUuid,
            buildPhase: buildPhase
        };
    }

    function getLibEntryFromGroup(libNames) {
        var pbxGroup = xcodeproj.hash.project.objects['PBXGroup']
        var isMatch;

        for (var key in pbxGroup) {
            // only look for comments
            if (!COMMENT_KEY.test(key)) continue;

            for (var matchName of libNames) {
                var groupKey = key.split(COMMENT_KEY)[0];
                for (var id in pbxGroup[groupKey].children) {
                    // console.log('> get PBXGroup find ' + matchName + ' in ' + groupKey + ' ' + pbxGroup[groupKey].children[id].comment)
                    // console.log('> get PBXGroup find ' + matchName + ' in ' + groupKey + ' ' + pbxGroup[groupKey].children[id].value)
                    if (pbxGroup[groupKey].children[id].comment.indexOf(matchName) !== -1) {
                        isMatch = pbxGroup[groupKey].children[id];
                        break
                    }
                }
                if (isMatch) break
            }
            if (isMatch) break
        }
        if (isMatch) {
            return isMatch
        } else {
            return
        }
    }

    /**
     * 
     * 
     * @param {any} target target uuid
     * @param {any} dependencyTargets [dependencyTargets uuid]
     * @returns 
     */
    function addTargetDependencyTo(targetName, projectName) {
        var pbxTargetDependency = 'PBXTargetDependency'
        var pbxContainerItemProxy = 'PBXContainerItemProxy'
        var projectXcodeproj = [projectName + '.xcodeproj', 'libCordova.a']
        var pbxTargetDependencySection = xcodeproj.hash.project.objects[pbxTargetDependency]
        var pbxContainerItemProxySection = xcodeproj.hash.project.objects[pbxContainerItemProxy]
        var pbxFileReferenceSection = xcodeproj.pbxFileReferenceSection()
        var nativeTargets = xcodeproj.pbxNativeTargetSection()
        var itemProxyUuid = xcodeproj.generateUuid()
        var targetDependencyUuid = xcodeproj.generateUuid()
        var itemProxy = {
            isa: pbxContainerItemProxy,
            containerPortal: undefined,
            proxyType: 1,
            remoteGlobalIDString: undefined,
            remoteInfo: projectName
        }
        var targetDependency = {
            isa: pbxTargetDependency,
            name: projectName,
            targetProxy: itemProxyUuid // + '/* ' + pbxContainerItemProxy + ' */'
        }
        var target;

        console.log(sep)
        var libUUID = getLibEntryFromGroup(projectXcodeproj)
        console.log('> get PBXContainerItemProxy ' + projectXcodeproj.join(',') + ' uuid... ' + libUUID.value + ' ' + libUUID.comment)
        if (libUUID) {
            itemProxy.containerPortal = libUUID.value + ' ' + '/* ' + libUUID.comment + ' */'
            console.log('> get PBXContainerItemProxy ' + projectXcodeproj.join(',') + ' uuid... ' + libUUID.value + ' ' + libUUID.comment)
        }
        console.log(sep)

        // console.log(sep)
        // console.log('> find ' + projectXcodeproj[0] + ',' + projectXcodeproj[1] + ' in FileReferenceSection')
        // for (var key in pbxFileReferenceSection) {
        //     console.log('> get ' + projectXcodeproj[0] + ',' + projectXcodeproj[1] + ' FileReferenceSection name ' + key + ' ' + pbxFileReferenceSection[key].name)
        //     if (!pbxFileReferenceSection[key].name) continue
        //     var isMatch;
        //     for (var matchName of projectXcodeproj) {
        //         if (pbxFileReferenceSection[key].name.indexOf(matchName) !== -1) {
        //             isMatch = key;
        //         }
        //     }
        //     if (isMatch) {
        //         itemProxy.containerPortal = key
        //         console.log('> get PBXContainerItemProxy ' + projectXcodeproj + ' uuid... ' + key)
        //     }
        // }
        // console.log(sep)
        for (var key in nativeTargets) {
            if (!nativeTargets[key].name) continue
            if (nativeTargets[key].name.indexOf(targetName) !== -1) {
                target = key
                console.log('> get ' + targetName + ' uuid... ' + key)
            }
        }
        _.filter(
            pbxContainerItemProxySection,
            function (entry, id, context) {
                // console.log('> evaluate... ' + entry.proxyType + ' | ' + entry.remoteInfo + ' | ' + projectName)
                if (entry.proxyType === 1 && entry.remoteInfo.indexOf(projectName) !== -1) {
                    itemProxy.remoteGlobalIDString = entry.remoteGlobalIDString
                    console.log('> get ' + projectName + ' remoteGlobalIDString... ' + entry.remoteGlobalIDString)
                }
            }
        )

        if (pbxContainerItemProxySection && pbxTargetDependencySection) {
            pbxContainerItemProxySection[itemProxyUuid] = itemProxy;
            pbxTargetDependencySection[targetDependencyUuid] = targetDependency;

            nativeTargets[target].dependencies.push({
                value: targetDependencyUuid,
                comment: pbxTargetDependency
            })
            console.log(sep);
        }
    }

    function addProductFile(targetPath, opt) {
        // var file = xcodeproj.getNewPbxFile(targetPath, opt);
        var file = new pbxFile(targetPath, opt);

        file.includeInIndex = 0;
        file.fileRef = xcodeproj.generateUuid();
        file.target = opt ? opt.target : undefined;
        file.group = opt ? opt.group : undefined;
        file.uuid = xcodeproj.generateUuid();
        file.path = file.basename;

        xcodeproj.addToPbxFileReferenceSection(file);
        xcodeproj.addToProductsPbxGroup(file); // PBXGroup

        return file;
    }

    function pbxCopyFilesBuildPhaseObj(obj, folderType, subfolderPath, phaseName) {

        // Add additional properties for 'CopyFiles' build phase
        var DESTINATION_BY_TARGETTYPE = {
            application: 'wrapper',
            app_extension: 'plugins',
            bundle: 'wrapper',
            command_line_tool: 'wrapper',
            dynamic_library: 'products_directory',
            framework: 'shared_frameworks',
            frameworks: 'frameworks',
            static_library: 'products_directory',
            unit_test_bundle: 'wrapper',
            watch_app: 'wrapper',
            watch_extension: 'plugins'
        }
        var SUBFOLDERSPEC_BY_DESTINATION = {
            absolute_path: 0,
            executables: 6,
            frameworks: 10,
            java_resources: 15,
            plugins: 13,
            products_directory: 16,
            resources: 7,
            shared_frameworks: 11,
            shared_support: 12,
            wrapper: 1,
            xpc_services: 0
        }

        obj.name = '"' + phaseName + '"';
        obj.dstPath = subfolderPath || '""';
        obj.dstSubfolderSpec = SUBFOLDERSPEC_BY_DESTINATION[DESTINATION_BY_TARGETTYPE[folderType]];

        return obj;
    }

    function pbxShellScriptBuildPhaseObj(obj, options, phaseName) {
        obj.name = '"' + phaseName + '"';
        obj.inputPaths = options.inputPaths || [];
        obj.outputPaths = options.outputPaths || [];
        obj.shellPath = options.shellPath;
        obj.shellScript = '"' + options.shellScript.replace(/"/g, '\\"') + '"';

        return obj;
    }

    function producttypeForTargettype(targetType) {
        var PRODUCTTYPE_BY_TARGETTYPE = {
            application: 'com.apple.product-type.application',
            app_extension: 'com.apple.product-type.app-extension',
            bundle: 'com.apple.product-type.bundle',
            command_line_tool: 'com.apple.product-type.tool',
            dynamic_library: 'com.apple.product-type.library.dynamic',
            framework: 'com.apple.product-type.framework',
            static_library: 'com.apple.product-type.library.static',
            unit_test_bundle: 'com.apple.product-type.bundle.unit-test',
            watch_app: 'com.apple.product-type.application.watchapp',
            watch_extension: 'com.apple.product-type.watchkit-extension'
        };

        return PRODUCTTYPE_BY_TARGETTYPE[targetType]
    }

    function filetypeForProducttype(productType) {
        var FILETYPE_BY_PRODUCTTYPE = {
            'com.apple.product-type.application': '"wrapper.application"',
            'com.apple.product-type.app-extension': '"wrapper.app-extension"',
            'com.apple.product-type.bundle': '"wrapper.plug-in"',
            'com.apple.product-type.tool': '"compiled.mach-o.dylib"',
            'com.apple.product-type.library.dynamic': '"compiled.mach-o.dylib"',
            'com.apple.product-type.framework': '"wrapper.framework"',
            'com.apple.product-type.library.static': '"archive.ar"',
            'com.apple.product-type.bundle.unit-test': '"wrapper.cfbundle"',
            'com.apple.product-type.application.watchapp': '"wrapper.application"',
            'com.apple.product-type.watchkit-extension': '"wrapper.app-extension"'
        };

        return FILETYPE_BY_PRODUCTTYPE[productType]
    }

    /**
     * D11A8BD0652442D5A850DDF0 /* MainInterface.storyboard */
    /*= {
            isa = PBXFileReference; 
            explicitFileType = undefined; 
            fileEncoding = 9; 
            includeInIndex = 0; 
            lastKnownFileType = unknown; 
            path = MainInterface.storyboard; 
            sourceTree = "<group>"; 
           };
        */
    function hasFile(xcodeproj, filePath) {
        filePath = filePath.replace(/[\"|\']/g, '')
        var files = nonComments(xcodeproj.pbxFileReferenceSection()),
            file, id;
        for (id in files) {
            file = JSON.parse(JSON.stringify(files[id]));
            /* Begin PBXFileReference section */
            file.fileRef = id;
            var isPass = false
            isPass |= file.path.indexOf(filePath) != -1
            isPass |= file.name ? file.name.indexOf(filePath) != -1 : false
            if (isPass) {
                return file;
            }
        }

        return false;
    }

    function nonComments(obj) {
        var keys = Object.keys(obj),
            newObj = {},
            i = 0;

        for (i; i < keys.length; i++) {
            if (!COMMENT_KEY.test(keys[i])) {
                newObj[keys[i]] = obj[keys[i]];
            }
        }

        return newObj;
    }

    function pbxBuildPhaseObj(file) {
        var obj = Object.create(null);

        obj.value = file.uuid;
        obj.comment = longComment(file);

        return obj;
    }

    function longComment(file) {
        return f("%s in %s", file.basename.replace(/[\"|\']/g, ''), file.group);
    }

    function replacePlist(xcodeproj, xcBuildConfiguration) {
        var plist = getPlist(xcodeproj, xcBuildConfiguration)
        console.log("> get plist..." + plist)
        var entry = _.filter(
            xcBuildConfiguration,
            function (entry, id, context) {

                if (!entry.buildSettings || !entry.buildSettings.PRODUCT_NAME) return;
                if (entry.buildSettings.PRODUCT_NAME.indexOf(extensionName) != -1) {

                    xcBuildConfiguration[id].buildSettings.INFOPLIST_FILE = plist
                    console.log("> update Plist of buildSettings... " + id + " plist:" + plist)
                    // console.log(xcBuildConfiguration[id].buildSettings)
                    console.log(sep)
                    return entry;
                } else {
                    return;
                }
            }.bind(this)
        )
        return xcodeproj
    }

    function getPlist(xcodeproj, xcBuildConfiguration) {
        if (plistValue) return plistValue

        if (projectName) {
            var entry = _.filter(
                xcBuildConfiguration,
                function (entry) {
                    if (!entry.buildSettings || !entry.buildSettings.INFOPLIST_FILE || !entry.buildSettings.PRODUCT_NAME) return;
                    // console.log(entry)
                    var name = entry.buildSettings.PRODUCT_NAME
                    if (name.indexOf(projectName) != -1) {
                        return entry;
                    } else {
                        return;
                    }
                }.bind(this)
            )
            // console.log(entry)
            if (_.size(entry) > 0) {
                plistValue = path.join(path.dirname(entry[0].buildSettings.INFOPLIST_FILE.replace('"', '')), 'Resources', 'SharingFrom-Info.plist');
                //path.dirname(entry[0].buildSettings.INFOPLIST_FILE)
            }
        }

        return plistValue;

    }

    function getXcodeProjectPath(context) {
        var root = path.join(context.opts.projectRoot, "platforms", 'ios')

        var xcodeProjDir;
        var xcodeCordovaProj;

        try {
            xcodeProjDir = fs.readdirSync(root).filter(function (e) {
                return e.match(/\.xcodeproj$/i);
            })[0];
            if (!xcodeProjDir) {
                throw new Error('The provided path "' + root + '" is not a Cordova iOS project.');
            }

            var cordovaProjName = xcodeProjDir.substring(xcodeProjDir.lastIndexOf(path.sep) + 1, xcodeProjDir.indexOf('.xcodeproj'));
            xcodeCordovaProj = path.join(root, cordovaProjName);
        } catch (e) {
            throw new Error('The provided path "' + root + '" is not a Cordova iOS project.');
        }

        return path.join(root, xcodeProjDir, 'project.pbxproj')
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
