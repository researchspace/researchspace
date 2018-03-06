Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var request = require("superagent");
var URI = require("urijs");
var Region = (function () {
    function Region() {
    }
    return Region;
}());
exports.Region = Region;
(function (Region) {
    var Full = (function (_super) {
        tslib_1.__extends(Full, _super);
        function Full() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Full.prototype.toString = function () { return 'full'; };
        return Full;
    }(Region));
    Region.Full = Full;
    var Rectangular = (function (_super) {
        tslib_1.__extends(Rectangular, _super);
        function Rectangular(x, y, width, height) {
            var _this = _super.call(this) || this;
            _this.x = x;
            _this.y = y;
            _this.width = width;
            _this.height = height;
            return _this;
        }
        Rectangular.prototype.toString = function () { return this.x + "," + this.y + "," + this.width + "," + this.height; };
        return Rectangular;
    }(Region));
    var Absolute = (function (_super) {
        tslib_1.__extends(Absolute, _super);
        function Absolute() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Absolute;
    }(Rectangular));
    Region.Absolute = Absolute;
    var Percent = (function (_super) {
        tslib_1.__extends(Percent, _super);
        function Percent() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Percent.prototype.toString = function () { return 'pct:' + _super.prototype.toString.call(this); };
        return Percent;
    }(Rectangular));
    Region.Percent = Percent;
    Region.full = new Full();
})(Region = exports.Region || (exports.Region = {}));
exports.Region = Region;
var Size = (function () {
    function Size() {
    }
    return Size;
}());
exports.Size = Size;
(function (Size) {
    var Full = (function (_super) {
        tslib_1.__extends(Full, _super);
        function Full() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Full.prototype.toString = function () { return 'full'; };
        return Full;
    }(Size));
    Size.Full = Full;
    var Rectangular = (function (_super) {
        tslib_1.__extends(Rectangular, _super);
        function Rectangular(width, height) {
            var _this = _super.call(this) || this;
            _this.width = width;
            _this.height = height;
            return _this;
        }
        Rectangular.prototype.toString = function () { return (this.width ? this.width : '') + "," + (this.height ? this.height : ''); };
        return Rectangular;
    }(Size));
    var Absolute = (function (_super) {
        tslib_1.__extends(Absolute, _super);
        function Absolute() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Absolute;
    }(Rectangular));
    Size.Absolute = Absolute;
    var BestFit = (function (_super) {
        tslib_1.__extends(BestFit, _super);
        function BestFit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BestFit.prototype.toString = function () { return '!' + _super.prototype.toString.call(this); };
        return BestFit;
    }(Rectangular));
    Size.BestFit = BestFit;
    var Percent = (function (_super) {
        tslib_1.__extends(Percent, _super);
        function Percent(scale) {
            var _this = _super.call(this) || this;
            _this.scale = scale;
            return _this;
        }
        Percent.prototype.toString = function () { return "pct:" + this.scale; };
        return Percent;
    }(Size));
    Size.Percent = Percent;
    Size.full = new Full();
})(Size = exports.Size || (exports.Size = {}));
exports.Size = Size;
var Rotation = (function () {
    function Rotation() {
    }
    return Rotation;
}());
exports.Rotation = Rotation;
(function (Rotation) {
    var Degrees = (function (_super) {
        tslib_1.__extends(Degrees, _super);
        function Degrees(angle) {
            var _this = _super.call(this) || this;
            _this.angle = angle;
            return _this;
        }
        Degrees.prototype.toString = function () { return "" + this.angle; };
        return Degrees;
    }(Rotation));
    var Clockwise = (function (_super) {
        tslib_1.__extends(Clockwise, _super);
        function Clockwise() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Clockwise;
    }(Degrees));
    Rotation.Clockwise = Clockwise;
    var MirrorThenClockwise = (function (_super) {
        tslib_1.__extends(MirrorThenClockwise, _super);
        function MirrorThenClockwise() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MirrorThenClockwise.prototype.toString = function () { return '!' + _super.prototype.toString.call(this); };
        return MirrorThenClockwise;
    }(Degrees));
    Rotation.MirrorThenClockwise = MirrorThenClockwise;
    Rotation.zero = new Clockwise(0);
})(Rotation = exports.Rotation || (exports.Rotation = {}));
exports.Rotation = Rotation;
var Quality;
(function (Quality) {
    Quality[Quality["Color"] = 0] = "Color";
    Quality[Quality["Gray"] = 1] = "Gray";
    Quality[Quality["Bitonal"] = 2] = "Bitonal";
    Quality[Quality["Default"] = 3] = "Default";
})(Quality = exports.Quality || (exports.Quality = {}));
function constructImageUri(serverAndPrefix, params) {
    var region = params.region || Region.full;
    var size = params.size || Size.full;
    var rotation = params.rotation || Rotation.zero;
    var quality = Quality[params.quality || Quality.Default].toLowerCase();
    var format = params.format;
    return serverAndPrefix + ("/" + params.imageId + "/" + region + "/" + size + "/" + rotation + "/" + quality + "." + format);
}
exports.constructImageUri = constructImageUri;
function constructInformationRequestUri(serverAndPrefix, imageId) {
    return constructServiceRequestUri(serverAndPrefix, imageId) + "/info.json";
}
exports.constructInformationRequestUri = constructInformationRequestUri;
function constructServiceRequestUri(serverAndPrefix, imageId) {
    return serverAndPrefix + ("/" + imageId);
}
exports.constructServiceRequestUri = constructServiceRequestUri;
function queryImageBounds(serverAndPrefix, imageId) {
    var uri = constructInformationRequestUri(serverAndPrefix, imageId);
    return Kefir.fromNodeCallback(function (cb) {
        request
            .get(uri)
            .accept('application/ld+json')
            .end(function (err, res) {
            if (res) {
                var json = JSON.parse(res.text);
                cb(err, json);
            }
            else {
                cb(err);
            }
        });
    }).toProperty();
}
exports.queryImageBounds = queryImageBounds;
function getIIIFServerUrl(relativeOrAbsoluteUrl) {
    return URI(relativeOrAbsoluteUrl).absoluteTo(window.location.href).toString();
}
exports.getIIIFServerUrl = getIIIFServerUrl;
