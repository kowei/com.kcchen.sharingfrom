// exports.ACTION_VIEW = 'android.intent.action.VIEW';
// exports.EXTRA_TEXT = 'android.intent.extra.TEXT';
// exports.ACTION_SEND = 'android.intent.action.SEND';
// exports.EXTRA_SUBJECT = 'android.intent.extra.SUBJECT';
// exports.EXTRA_STREAM = 'android.intent.extra.STREAM';
// exports.EXTRA_EMAIL = 'android.intent.extra.EMAIL';
// exports.ACTION_CALL = 'android.intent.action.CALL';
// exports.ACTION_SENDTO = 'android.intent.action.SENDTO';
// exports.startActivity = function (params) {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'startActivity', [params]
//         );
//     });
// };
// exports.hasExtra = function (params) {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'hasExtra', [params]
//         );
//     });
// };
// exports.getExtra = function (params) {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'getExtra', [params]
//         );
//     });
// };
// exports.getUri = function () {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'getUri', []
//         );
//     });
// };
// exports.onNewIntent = function () {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(typeof args === 'string' && args !== 'onNewIntent' ? JSON.parse(args) : void 0);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'onNewIntent', []
//         );
//     });
// };
// exports.clearIntent = function () {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'clearIntent', []
//         );
//     });
// };
// exports.sendBroadcast = function (params) {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             function (args) {
//                 resolve(args);
//             },
//             function (args) {
//                 reject(args);
//             },
//             'SharingFrom',
//             'sendBroadcast', [params]
//         );
//     });
// };
// exports.close = function () {
//     return new Promise(function(resolve, reject) {
//         cordova.exec(
//             null,
//             null,
//             'SharingFrom',
//             'close', []
//         );
//     });
// };

/**
 * @return SharingFrom instance
 */
module.exports = (function() {
    var cordova = cordova || window.cordova;

    function SharingFrom() {}
    SharingFrom.ACTION_VIEW = 'android.intent.action.VIEW';
    SharingFrom.EXTRA_TEXT = 'android.intent.extra.TEXT';
    SharingFrom.ACTION_SEND = 'android.intent.action.SEND';
    SharingFrom.EXTRA_SUBJECT = 'android.intent.extra.SUBJECT';
    SharingFrom.EXTRA_STREAM = 'android.intent.extra.STREAM';
    SharingFrom.EXTRA_EMAIL = 'android.intent.extra.EMAIL';
    SharingFrom.ACTION_CALL = 'android.intent.action.CALL';
    SharingFrom.ACTION_SENDTO = 'android.intent.action.SENDTO';

    SharingFrom.prototype.startActivity = function(params, success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'startActivity', [params]);
    }

    SharingFrom.prototype.hasExtra = function(params, success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'hasExtra', [params]);
    }

    SharingFrom.prototype.getExtra = function(params, success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'getExtra', [params]);
    }

    SharingFrom.prototype.getUri = function(success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'getUri', []);
    }

    SharingFrom.prototype.onNewIntent = function(success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'onNewIntent', []);
    }

    SharingFrom.prototype.clearIntent = function(success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'clearIntent', []);
    }

    SharingFrom.prototype.sendBroadcast = function(params, success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'sendBroadcast', [params]);
    }

    SharingFrom.prototype.close = function(success, failure) {
        cordova.exec(success, failure, 'SharingFrom', 'close', []);
    }

    return new SharingFrom();
})();
