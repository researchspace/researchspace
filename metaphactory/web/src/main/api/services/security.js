Object.defineProperty(exports, "__esModule", { value: true });
var request = require("superagent");
var _ = require("lodash");
var Kefir = require("kefir");
var Immutable = require("immutable");
var async_1 = require("platform/api/async");
var Permissions;
(function (Permissions) {
    Permissions.templateSave = 'templates:edit:save';
    var sparqlQueryEditor = 'ui:component:view:mp:sparql:query:editor';
    Permissions.queryEditorSave = sparqlQueryEditor + ":save";
    Permissions.queryEditorSelectEndpoint = sparqlQueryEditor + ":select:repository";
})(Permissions = exports.Permissions || (exports.Permissions = {}));
var SecurityUtil = (function () {
    function SecurityUtil() {
        var _this = this;
        this.pool = new async_1.BatchedPool({ fetch: function (perms) { return _this.fetchPermitted(perms.toArray()); } });
    }
    SecurityUtil.prototype.getUser = function (cb) {
        if (cb) {
            this.getUser().then(cb);
            return;
        }
        var WINDOW_user = 'cache_user';
        if (!_.isUndefined(window[WINDOW_user])) {
            return Promise.resolve(window[WINDOW_user]);
        }
        return new Promise(function (resolve, reject) {
            request.get('/rest/security/user')
                .type('application/json')
                .accept('application/json')
                .end(function (err, res) {
                if (err) {
                    reject(err);
                }
                else {
                    var user = JSON.parse(res.text);
                    window[WINDOW_user] = user;
                    resolve(user);
                }
            });
        });
    };
    SecurityUtil.prototype.isPermitted = function (permissionString) {
        return this.pool.query(permissionString);
    };
    SecurityUtil.prototype.fetchPermitted = function (permissionStrings) {
        var req = request.post('/rest/security/permissions')
            .send(permissionStrings)
            .type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) { return cb(err, res.body); }); }).toProperty().map(function (batch) { return Immutable.Map(batch); });
    };
    SecurityUtil.prototype.isAnonymous = function (cb) {
        var WINDOW_isAnonymousUser = 'cache_isAnonymousUser';
        if (!_.isUndefined(window[WINDOW_isAnonymousUser])) {
            cb(window[WINDOW_isAnonymousUser]);
            return;
        }
        this.getUser(function (userObject) {
            window[WINDOW_isAnonymousUser] = userObject.isAnonymous;
            cb(userObject.isAnonymous);
        });
    };
    SecurityUtil.prototype.getSessionInfo = function (cb) {
        return request.get('/rest/security/getSessionInfo')
            .type('application/json')
            .accept('application/json')
            .end(function (err, res) {
            cb(JSON.parse(res.text));
        });
    };
    SecurityUtil.prototype.touchSession = function (cb) {
        return request.post('/rest/security/touchSession')
            .end(function (err, res) {
            cb(res.status);
        });
    };
    SecurityUtil.prototype.getAllAccounts = function () {
        var req = request.get('/rest/security/getAllAccounts').
            type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? JSON.parse(res.text) : null);
        }); }).toProperty();
    };
    SecurityUtil.prototype.createAccount = function (account) {
        var req = request.post('/rest/security/createAccount')
            .send(account)
            .type('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.text : null, res.ok ? true : null);
        }); }).toProperty();
    };
    SecurityUtil.prototype.updateAccount = function (account) {
        var req = request.put('/rest/security/updateAccount')
            .send(account)
            .type('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.text : null, res.ok ? true : null);
        }); }).toProperty();
    };
    SecurityUtil.prototype.deleteAccount = function (account) {
        var req = request.del('/rest/security/deleteAccount/' + account.principal);
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.response.text : null, res.ok ? true : null);
        }); }).toProperty();
    };
    SecurityUtil.prototype.getRoleDefinitions = function () {
        var req = request.get('/rest/security/getAllRoleDefinitions').
            type('application/json')
            .accept('application/json');
        return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
            cb(err != null ? err.message : null, res.ok ? JSON.parse(res.text) : null);
        }); }).toProperty();
    };
    return SecurityUtil;
}());
exports.SecurityUtil = SecurityUtil;
exports.Util = new SecurityUtil();
