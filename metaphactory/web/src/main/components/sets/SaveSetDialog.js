Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var react_bootstrap_1 = require("react-bootstrap");
var _ = require("lodash");
var classNames = require("classnames");
var spinner_1 = require("platform/components/ui/spinner");
var States;
(function (States) {
    States[States["USER_INPUT"] = 0] = "USER_INPUT";
    States[States["LOADING"] = 1] = "LOADING";
    States[States["ERROR"] = 2] = "ERROR";
    States[States["SUCCESS"] = 3] = "SUCCESS";
})(States || (States = {}));
var KEY_RETURN = 13;
var SaveSetDialog = (function (_super) {
    tslib_1.__extends(SaveSetDialog, _super);
    function SaveSetDialog() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SaveSetDialog.prototype.render = function () {
        return React.createElement(react_bootstrap_1.Modal, { show: true, className: 'save-as-dataset-modal', onHide: this.props.onHide },
            React.createElement(react_bootstrap_1.Modal.Header, { closeButton: true },
                React.createElement(react_bootstrap_1.Modal.Title, null, this.props.title)),
            React.createElement(react_bootstrap_1.Modal.Body, null, React.createElement(HeadlessSaveSetDialog, this.props)));
    };
    return SaveSetDialog;
}(react_1.Component));
SaveSetDialog.defaultProps = {
    title: 'Save as new set',
    placeholder: 'Name of the set',
};
exports.SaveSetDialog = SaveSetDialog;
var HeadlessSaveSetDialog = (function (_super) {
    tslib_1.__extends(HeadlessSaveSetDialog, _super);
    function HeadlessSaveSetDialog(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onKeyPress = function (event) {
            if (event.keyCode === KEY_RETURN) {
                event.preventDefault();
                event.stopPropagation();
                _this.onSave();
            }
        };
        _this.onSave = function (event) {
            var setName = _this.getInputElement().value;
            if (setName.length < 6) {
                return _this.setState({
                    state: States.ERROR,
                    errorMessage: "Name of the set must have at least six characters.",
                });
            }
            event && event.preventDefault();
            _this.setState({
                state: States.LOADING,
            });
            var saveResult = _this.props.onSave(setName);
            var callback = function (event) {
                if (event.type === 'value') {
                    _this.setState({
                        state: States.SUCCESS,
                    });
                    saveResult.offAny(callback);
                    _.delay(function () {
                        _this.props.onHide();
                    }, 3000);
                }
                else if (event.type === 'error') {
                    _this.setState({
                        state: States.ERROR,
                        errorMessage: event.value.response.text,
                    });
                }
            };
            saveResult.onAny(callback);
        };
        _this.showMessage = function () {
            var maxSetSize = _this.props.maxSetSize;
            switch (_this.state.state) {
                case States.USER_INPUT:
                    return null;
                case States.LOADING:
                    return React.createElement(spinner_1.Spinner, null);
                case States.SUCCESS:
                    return React.createElement("div", { className: 'save-as-dataset-modal__success-message' },
                        "New set has been saved successfully!",
                        React.createElement("br", null),
                        maxSetSize.isJust
                            ? 'Please be aware that the system has been configured ' +
                                'to allow for storing ' + maxSetSize.get() + ' at maximum.'
                            : '');
                case States.ERROR:
                    return React.createElement("div", { className: 'save-as-dataset-modal__error-message' }, _this.state.errorMessage);
            }
        };
        _this.state = {
            state: States.USER_INPUT,
        };
        return _this;
    }
    HeadlessSaveSetDialog.prototype.render = function () {
        return React.createElement("div", null,
            this.showMessage(),
            this.renderBody());
    };
    HeadlessSaveSetDialog.prototype.renderBody = function () {
        var state = this.state.state;
        var isLoading = state === States.LOADING;
        var isSaved = state === States.SUCCESS;
        return React.createElement("div", { className: classNames('form-inline', 'save-as-dataset-modal__form') },
            React.createElement("input", { className: classNames('form-control', 'save-as-dataset-modal__form__collection-name'), placeholder: this.props.placeholder, type: 'text', ref: 'setName', onKeyDown: this.onKeyPress }),
            React.createElement("button", { className: classNames('btn', 'btn-primary', 'save-as-dataset-modal__form__save-button'), disabled: isLoading || isSaved, onClick: this.onSave }, isLoading ? 'Saving...' : 'Save'));
    };
    HeadlessSaveSetDialog.prototype.getInputElement = function () {
        return react_dom_1.findDOMNode(this.refs['setName']);
    };
    return HeadlessSaveSetDialog;
}(react_1.Component));
HeadlessSaveSetDialog.defaultProps = {
    placeholder: 'Name of the set',
};
exports.HeadlessSaveSetDialog = HeadlessSaveSetDialog;
