Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var navigation_1 = require("platform/api/navigation");
var SearchProfileLdpService_1 = require("platform/components/semantic/search/data/profiles/SearchProfileLdpService");
var CreateProfileDialog_1 = require("./CreateProfileDialog");
require('../../../less/create-new-profile-action.less');
var CreateNewProfileActionButton = (function (_super) {
    tslib_1.__extends(CreateNewProfileActionButton, _super);
    function CreateNewProfileActionButton(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            showDialog: false,
            errorMessage: maybe.Nothing(),
        };
        return _this;
    }
    CreateNewProfileActionButton.prototype.render = function () {
        return react_1.DOM.div({
            className: 'create-new-profile',
        }, this.button(), this.dialog());
    };
    CreateNewProfileActionButton.prototype.button = function () {
        return react_1.DOM.button({
            className: 'create-new-profile__button',
            onClick: this.showDialog.bind(this),
        }, 'Create New Profile');
    };
    CreateNewProfileActionButton.prototype.dialog = function () {
        return CreateProfileDialog_1.default({
            show: this.state.showDialog,
            onHide: this.hideDialog.bind(this),
            onSave: this.onSave.bind(this),
            error: this.state.errorMessage,
        });
    };
    CreateNewProfileActionButton.prototype.onSave = function (_a) {
        var _this = this;
        var name = _a.name, description = _a.description;
        SearchProfileLdpService_1.default.createProfile(name, description).onValue(function (newResourceIri) {
            _this.hideDialog.bind(_this);
            navigation_1.navigateToResource(newResourceIri).onValue(function () { });
        }).onError(function (error) { return _this.setState({
            errorMessage: maybe.Just(error),
        }); });
    };
    CreateNewProfileActionButton.prototype.showDialog = function () {
        this.setState({
            showDialog: true,
        });
    };
    CreateNewProfileActionButton.prototype.hideDialog = function () {
        this.setState({
            showDialog: false,
        });
    };
    return CreateNewProfileActionButton;
}(react_1.Component));
exports.CreateNewProfileActionButton = CreateNewProfileActionButton;
exports.default = CreateNewProfileActionButton;
