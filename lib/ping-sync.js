'use strict';

/**
 * LICENSE MIT
 * (C) Daniel Zelisko, Rich Dunne
 * http://github.com/smartbrother/node-ping
 *
 * a simple wrapper for ping
 * Now with support of not only english Windows.
 *
 */

// System library
var util = require('util');
var net = require('net');
var cp = require('child_process');
var os = require('os');

// 3rd-party library
var Q = require('q');
var __ = require('underscore');

// Our library
var builderFactory = require('./builder/factory');
var parserFactory = require('./parser/factory');

/**
 * Refer to probe()
 */
function _probe(addr, config) {
    // Do not reassign function argument
    var _config = config || {};
    if (_config.v6 === undefined) {
        _config.v6 = net.isIPv6(addr);
    }

    // Convert callback base system command to promise base
    var deferred = Q.defer();

    // Execute ping synchronously in current thread
    var ping = null;
    var platform = os.platform();
    try {
        var argumentBuilder = builderFactory.createBuilder(platform);
        var pingExecutablePath = builderFactory.getExecutablePath(platform, _config.v6);
        var pingArgs = argumentBuilder.getCommandArguments(addr, _config);
        var spawnOptions = argumentBuilder.getSpawnOptions();
        ping = cp.spawnSync(pingExecutablePath, pingArgs, spawnOptions);
    } catch (err) {
        deferred.reject(err);
        return deferred.promise;
    }

    // Initial parser
    var parser = parserFactory.createParser(addr, platform, _config);

    // Process ping result
    if (ping.stderr.length > 0) {
        var err = new Error(
            util.format(
                'ping.probe: %s. %s',
                'there was an error while executing the ping program. ',
                'Check the path or permissions...'
            )
        );
        deferred.reject(err);
    } else if (ping.stdout.length > 0) {
        // Merge lines we have and split it by \n
        var lines = ping.stdout.split('\n');

        // Parse line one by one
        __.each(lines, parser.eat, parser);

        // Get result
        var ret = parser.getResult();

        deferred.resolve(ret);
    }

    return deferred.promise;
}

/**
 * Class::PromiseSync
 * @param {string} addr - Hostname or ip addres
 * @param {PingConfig} config - Configuration for command ping
 * @return {Promise}
 */
function probe(addr, config) {
    try {
        var probePromise = _probe(addr, config);
        return probePromise;
    } catch (error) {
        var errorPromise = Q.reject(error);
        return errorPromise;
    }
}

exports.probe = probe;
