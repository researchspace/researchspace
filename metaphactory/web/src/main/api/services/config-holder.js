Object.defineProperty(exports, "__esModule", { value: true });
var ConfigService = require("./config");
var Kefir = require("kefir");
var ConfigHolderClass = (function () {
    function ConfigHolderClass() {
        this.isLoading = true;
    }
    ConfigHolderClass.prototype.getEnvironmentConfig = function () {
        if (this.isLoading) {
            throw Error('Config has not been initialized yet');
        }
        return this.environmentConfig;
    };
    ConfigHolderClass.prototype.getUIConfig = function () {
        if (this.isLoading) {
            throw Error('Config has not been initialized yet');
        }
        return this.uiConfig;
    };
    ConfigHolderClass.prototype.getGlobalConfig = function () {
        if (this.isLoading) {
            throw Error('Config has not been initialized yet');
        }
        return this.globalConfig;
    };
    ConfigHolderClass.prototype.initializeConfig = function () {
        var _this = this;
        return Kefir.zip([this.fetchEnvironmentConfig(), this.fetchUIConfig(), this.fetchGlobalConfig()]).map(function (val) {
            _this.isLoading = false;
            return true;
        })
            .toProperty();
    };
    ConfigHolderClass.prototype.fetchEnvironmentConfig = function () {
        var _this = this;
        return ConfigService.getConfigsInGroup('environment').flatMap(function (config) {
            if (!config.resourceUrlMapping) {
                return Kefir.constantError('Configuration property "resourceUrlMapping" is undefined. ' +
                    'Most likely permissions for reading the configuration properties are not set correctly.');
            }
            _this.environmentConfig = config;
            return Kefir.constant(true);
        }).toProperty();
    };
    ConfigHolderClass.prototype.fetchUIConfig = function () {
        var _this = this;
        return ConfigService.getConfigsInGroup('ui').map(function (config) {
            _this.uiConfig = config;
            return true;
        });
    };
    ConfigHolderClass.prototype.fetchGlobalConfig = function () {
        var _this = this;
        return ConfigService.getConfigsInGroup('global').map(function (config) {
            _this.globalConfig = config;
            return true;
        });
    };
    return ConfigHolderClass;
}());
exports.ConfigHolderClass = ConfigHolderClass;
exports.ConfigHolder = new ConfigHolderClass();
