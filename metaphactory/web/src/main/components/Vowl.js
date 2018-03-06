Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
require("webvowl/deploy/js/d3.min.js");
require("webvowl/deploy/js/webvowl.js");
require("webvowl/deploy/js/webvowl.app.js");
var react_1 = require("react");
require("./Vowl.scss");
var Kefir = require("kefir");
var request = require("superagent");
var notification_1 = require("platform/components/ui/notification");
var ENDPOINT = '/rest/ontologies/vowl';
var signature = require('raw-loader!webvowl/deploy/index.html');
var Vowl = (function (_super) {
    tslib_1.__extends(Vowl, _super);
    function Vowl(props) {
        var _this = _super.call(this, props) || this;
        _this.getVowlJson = function () {
            var req = request.get(ENDPOINT)
                .type('application/json')
                .accept('application/json')
                .query({ ontologyIri: _this.props.ontologyIri });
            return Kefir.fromNodeCallback(function (cb) { return req.end(function (err, res) {
                cb(_this.errorToString(err), res ? res.body : null);
            }); }).toProperty();
        };
        _this.errorToString = function (err) {
            if (err !== null) {
                var status_1 = err['status'];
                if (500 === status_1) {
                    return "Some internal server error when processing the ontology. \n          Please contact your administrator.";
                }
                else {
                    return err.rawResponse;
                }
            }
            return null;
        };
        _this.state = {
            error: undefined
        };
        return _this;
    }
    Vowl.prototype.componentWillMount = function () {
        if (!this.props.ontologyIri) {
            throw new Error('Configuration attribute ontology-iri must not be empty.');
        }
    };
    Vowl.prototype.componentDidMount = function () {
        var _this = this;
        this.getVowlJson().onValue(function (v) {
            window['webvowl'].app().initialize(v);
        }).onError(function (errorMsg) { return _this.setState({ error: errorMsg }); });
    };
    Vowl.prototype.render = function () {
        if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        return react_1.DOM.div({ style: this.props.style,
            className: 'webvowl-import',
            dangerouslySetInnerHTML: {
                __html: signature
            }
        });
    };
    return Vowl;
}(react_1.Component));
exports.default = Vowl;
