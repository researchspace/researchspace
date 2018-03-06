Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var ReactBootstrap = require("react-bootstrap");
var assign = require("object-assign");
var classnames = require("classnames");
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var Button = react_1.createFactory(ReactBootstrap.Button);
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
var CreateProfileDialogClass = (function (_super) {
    tslib_1.__extends(CreateProfileDialogClass, _super);
    function CreateProfileDialogClass() {
        var _this = _super.call(this) || this;
        _this.state = {
            state: States.USER_INPUT,
            inputValidationState: {
                name: true,
                description: true,
            },
        };
        return _this;
    }
    CreateProfileDialogClass.prototype.componentWillMount = function () {
        this.initState(this.props);
    };
    CreateProfileDialogClass.prototype.componentWillReceiveProps = function (props) {
        this.initState(props);
    };
    CreateProfileDialogClass.prototype.render = function () {
        var _this = this;
        return Modal(assign({}, this.props, {
            className: 'new-profile-modal',
            onHide: this.props.onHide,
            onEntered: function () { return _this.getNameInputElement().focus(); },
        }), this.dialogHeader(), this.dialogBody());
    };
    CreateProfileDialogClass.prototype.initState = function (props) {
        if (props.error.isJust) {
            this.setState({
                state: States.ERROR,
                errorMessage: props.error.get(),
            });
        }
    };
    CreateProfileDialogClass.prototype.dialogHeader = function () {
        return ModalHeader({
            closeButton: true,
        }, ModalTitle({}, 'Create new Relationship Profile'));
    };
    CreateProfileDialogClass.prototype.dialogBody = function () {
        return ModalBody({}, this.showMessage(), react_1.DOM.form({
            className: 'new-profile-modal__form',
        }, react_1.DOM.input({
            className: this.inputClassName('new-profile-modal__form__profile-name', this.state.inputValidationState.name),
            placeholder: 'Profile Name',
            type: 'text',
            required: true,
            ref: CreateProfileDialogClass.nameInputRef,
        }), react_1.DOM.textarea({
            className: this.inputClassName('new-profile-modal__form__profile-description', this.state.inputValidationState.description),
            placeholder: 'Profile Description',
            required: true,
            ref: CreateProfileDialogClass.descriptionInputRef,
        }), Button({
            className: 'new-profile-modal__form__save-button',
            disabled: this.isLoading(),
            onClick: this.onSave.bind(this),
        }, this.isLoading() ? 'Saving...' : 'Save')));
    };
    CreateProfileDialogClass.prototype.onSave = function () {
        if (this.isFormValid()) {
            this.setState({
                state: States.LOADING,
            });
            this.props.onSave({
                name: this.getNameInputElement().value,
                description: this.getDescriptionInputElement().value,
            });
        }
        else {
            this.setState({
                state: States.ERROR,
                errorMessage: 'Some required fields are missing!',
            });
        }
    };
    CreateProfileDialogClass.prototype.showMessage = function () {
        switch (this.state.state) {
            case States.ERROR:
                return react_1.DOM.div({
                    className: 'save-as-dataset-modal__error-message',
                }, this.state.errorMessage);
            default: return null;
        }
    };
    CreateProfileDialogClass.prototype.isLoading = function () {
        return this.state.state === States.LOADING;
    };
    CreateProfileDialogClass.prototype.isFormValid = function () {
        var isNameValid = this.isInputValid('name');
        var isDescriptionValid = this.isInputValid('description');
        this.setState({
            inputValidationState: {
                name: isNameValid,
                description: isDescriptionValid,
            },
        });
        return isNameValid && isDescriptionValid;
    };
    CreateProfileDialogClass.prototype.inputClassName = function (baseClass, isValid) {
        return classnames((_a = {},
            _a[baseClass] = isValid,
            _a[baseClass + "--has-error"] = !isValid,
            _a));
        var _a;
    };
    CreateProfileDialogClass.prototype.isInputValid = function (ref) {
        return this.getInputElement(ref).validity.valid;
    };
    CreateProfileDialogClass.prototype.getNameInputElement = function () {
        return this.getInputElement(CreateProfileDialogClass.nameInputRef);
    };
    CreateProfileDialogClass.prototype.getDescriptionInputElement = function () {
        return this.getInputElement(CreateProfileDialogClass.descriptionInputRef);
    };
    CreateProfileDialogClass.prototype.getInputElement = function (ref) {
        return react_dom_1.findDOMNode(this.refs[ref]);
    };
    return CreateProfileDialogClass;
}(react_1.Component));
CreateProfileDialogClass.nameInputRef = 'name';
CreateProfileDialogClass.descriptionInputRef = 'description';
exports.CreateProfileDialogClass = CreateProfileDialogClass;
var CreateProfileDialog = react_1.createFactory(CreateProfileDialogClass);
exports.default = CreateProfileDialog;
