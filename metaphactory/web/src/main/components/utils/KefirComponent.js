Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var assign = require("object-assign");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var Spinner_1 = require("../ui/spinner/Spinner");
var KefirComponentBase = (function (_super) {
    tslib_1.__extends(KefirComponentBase, _super);
    function KefirComponentBase(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.requests = Kefir.pool();
        _this.requests
            .flatMapLatest(function (request) {
            if (!request) {
                return Kefir.never();
            }
            try {
                var task = _this.loadState(request);
                return task ? task : Kefir.never();
            }
            catch (e) {
                console.error(e);
                return Kefir.constantError(e.message);
            }
        })
            .onValue(function (state) { return _this.setState(function (previous) {
            return assign({}, previous, { loading: false }, state);
        }); })
            .onError(function (error) { return _this.setState(function (previous) {
            return assign({}, previous, { loading: false, error: error });
        }); });
        _this.state = _this.updateState({ loading: true });
        return _this;
    }
    KefirComponentBase.prototype.updateState = function (partialState) {
        return assign({}, this.state, partialState);
    };
    KefirComponentBase.prototype.componentDidMount = function () {
        this.requests.plug(Kefir.constant(this.props));
    };
    KefirComponentBase.prototype.componentWillReceiveProps = function (nextProps) {
        this.requests.plug(Kefir.constant(nextProps));
    };
    KefirComponentBase.prototype.componentWillUnmount = function () {
        this.requests.plug(Kefir.constant(undefined));
    };
    KefirComponentBase.prototype.render = function () {
        if (this.state.loading) {
            return Spinner_1.default({});
        }
        else if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else {
            return null;
        }
    };
    return KefirComponentBase;
}(components_1.Component));
exports.KefirComponentBase = KefirComponentBase;
