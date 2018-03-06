var Kefir = require("kefir");
var request = require("superagent");
var ConfigService;
(function (ConfigService) {
    var GET_CONFIG_GROUP = '/rest/config';
    var PUT_CONFIG = '/rest/config';
    function getConfigsInGroup(group) {
        var req = request
            .get(GET_CONFIG_GROUP + '/' + group)
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty();
    }
    ConfigService.getConfigsInGroup = getConfigsInGroup;
    function setConfig(configGroup, config, configValue) {
        var req = request
            .put(PUT_CONFIG + '/' + configGroup + '/' + config)
            .type('text/plain')
            .send(configValue);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? true : null);
        }); });
    }
    ConfigService.setConfig = setConfig;
})(ConfigService || (ConfigService = {}));
module.exports = ConfigService;
