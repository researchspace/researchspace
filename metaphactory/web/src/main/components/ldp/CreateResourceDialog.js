Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var ReactBootstrap = require("react-bootstrap");
var assign = require("object-assign");
var _ = require("lodash");
var classNames = require("classnames");
var block = require("bem-cn");
var spinner_1 = require("platform/components/ui/spinner");
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.Modal.Header);
var ModalTitle = react_1.createFactory(ReactBootstrap.Modal.Title);
var ModalBody = react_1.createFactory(ReactBootstrap.Modal.Body);
var States;
(function (States) {
    States[States["USER_INPUT"] = 0] = "USER_INPUT";
    States[States["LOADING"] = 1] = "LOADING";
    States[States["ERROR"] = 2] = "ERROR";
    States[States["SUCCESS"] = 3] = "SUCCESS";
})(States || (States = {}));
var REF_LDP_RESOURCE_NAME = 'ldpResourceName';
var b = block('create-ldp-resource-modal');
var CreateResourceDialog = (function (_super) {
    tslib_1.__extends(CreateResourceDialog, _super);
    function CreateResourceDialog() {
        var _this = _super.call(this) || this;
        _this.isLoading = function () {
            return _this.state.state === States.LOADING;
        };
        _this.isSuccess = function () {
            return _this.state.state === States.SUCCESS;
        };
        _this.onKeyPress = function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                event.stopPropagation();
                _this.onSave();
            }
        };
        _this.onSaveBtn = function (event) {
            event.preventDefault();
            event.stopPropagation();
            _this.onSave();
        };
        _this.onSave = function () {
            var resourceName = _this.getInputElement().value;
            if (resourceName.length === 0) {
                _this.setState({
                    state: States.ERROR,
                    errorMessage: 'Name of the resource must not be empty',
                });
            }
            else {
                _this.setState({
                    state: States.LOADING,
                });
                var saveResult_1 = _this.props.onSave(resourceName);
                var callback_1 = function (event) {
                    if (event.type === 'value') {
                        _this.setState({
                            state: States.SUCCESS,
                        });
                        saveResult_1.offAny(callback_1);
                        _.delay(function () {
                            _this.props.onHide();
                            _this.setState({
                                state: States.USER_INPUT,
                            });
                        }, 1000);
                    }
                    else if (event.type === 'error') {
                        _this.setState({
                            state: States.ERROR,
                            errorMessage: event.value.response.text,
                        });
                    }
                };
                saveResult_1.onAny(callback_1);
            }
        };
        _this.showMessage = function () {
            switch (_this.state.state) {
                case States.USER_INPUT:
                    return null;
                case States.LOADING:
                    return react_1.createElement(spinner_1.Spinner);
                case States.SUCCESS:
                    return react_1.DOM.div({
                        className: 'alert alert-success text-center',
                    }, 'New LDP resource has been created successfully!');
                case States.ERROR:
                    return react_1.DOM.div({
                        className: 'alert alert-danger text-center',
                    }, _this.state.errorMessage);
            }
        };
        _this.state = {
            state: States.USER_INPUT,
        };
        return _this;
    }
    CreateResourceDialog.prototype.render = function () {
        var _this = this;
        return Modal(assign({}, this.props, {
            className: classNames('form-group', b('')),
            onHide: this.props.onHide,
            onEntered: function () { return _this.getInputElement().focus(); },
        }), ModalHeader({ closeButton: true }, ModalTitle({}, this.props.title ? this.props.title : 'Create new resource')), ModalBody({}, this.showMessage(), react_1.DOM.form({
            className: b('form'),
        }, react_1.DOM.input({
            className: classNames('form-control', b('form__collection-name')),
            placeholder: this.props.placeholder ? this.props.placeholder : 'Name',
            type: 'text',
            ref: REF_LDP_RESOURCE_NAME,
            onKeyDown: this.onKeyPress,
        }), react_1.DOM.button({
            className: classNames('btn btn-primary', b('form__save-button')),
            disabled: this.isLoading() || this.isSuccess(),
            onClick: this.onSaveBtn,
        }, this.isLoading() ? 'Saving...' : 'Save'))));
    };
    CreateResourceDialog.prototype.getInputElement = function () {
        return react_dom_1.findDOMNode(this.refs[REF_LDP_RESOURCE_NAME]);
    };
    return CreateResourceDialog;
}(react_1.Component));
exports.CreateResourceDialog = CreateResourceDialog;
