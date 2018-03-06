Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var lodash_1 = require("lodash");
var maybe = require("data.maybe");
var ReactBootstrap = require("react-bootstrap");
var security_1 = require("platform/api/services/security");
var spinner_1 = require("platform/components/ui/spinner");
var alert_1 = require("platform/components/ui/alert");
var RoleMultiSelectorComponent_1 = require("./RoleMultiSelectorComponent");
require("./RealmManager.scss");
var Input = react_1.createFactory(ReactBootstrap.FormControl);
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var ControlLabel = react_1.createFactory(ReactBootstrap.ControlLabel);
var Btn = react_1.createFactory(ReactBootstrap.Button);
var Panel = react_1.createFactory(ReactBootstrap.Panel);
var INITIAL_NULL_VALUE = null;
var AccountStore = (function () {
    function AccountStore() {
        var _this = this;
        this.getAccountStream = function () {
            return _this.accountStream;
        };
        this.getPool = function (propertyName) {
            return _this[propertyName];
        };
        this.principal = Kefir.pool();
        this.password = Kefir.pool();
        this.passwordrepeat = Kefir.pool();
        this.roles = Kefir.pool();
        this.accountStream = Kefir.pool();
        Kefir.combine([this.principal, this.password, this.passwordrepeat, this.roles], function (principal, password, passwordrepeat, roles) {
            if (principal === INITIAL_NULL_VALUE || roles === INITIAL_NULL_VALUE) {
                return _this.accountStream.plug(Kefir.constant(maybe.Nothing()));
            }
            var errors = [];
            if (lodash_1.isEmpty(principal)) {
                errors.push('Principal must not be empty.');
            }
            if (lodash_1.isEmpty(roles) || lodash_1.isNull(roles)) {
                errors.push('Roles must not be empty.');
            }
            if ((password !== INITIAL_NULL_VALUE) && (lodash_1.isEmpty(password) || lodash_1.isEmpty(passwordrepeat))) {
                errors.push('Passwords must not be empty.');
            }
            else if (password !== passwordrepeat) {
                errors.push('Passwords must be equal.');
            }
            if (!lodash_1.isEmpty(errors)) {
                return _this.accountStream.plug(Kefir.constantError(errors.join('<br>')));
            }
            _this.accountStream.plug(Kefir.constant(maybe.Just({
                principal: principal,
                password: password,
                roles: roles,
            })));
        }).onValue(function (obs) { return obs; });
    }
    return AccountStore;
}());
var AccountFormComponent = (function (_super) {
    tslib_1.__extends(AccountFormComponent, _super);
    function AccountFormComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.initStore = function () {
            _this.accountStore = new AccountStore();
            _this.accountStore.getAccountStream().onError(function (error) {
                _this.setState({
                    isLoading: false,
                    updateAccount: maybe.Nothing(),
                    alert: maybe.Just(alert_1.Error(error)),
                });
            }).onValue(function (account) {
                _this.setState({
                    isLoading: false,
                    updateAccount: account,
                    alert: maybe.Nothing(),
                });
            });
            _this.accountStore.getPool('principal').onValue(function (val) {
                _this.setState({ isLoading: false, principal: val });
            });
            _this.accountStore.getPool('password').onValue(function (val) {
                _this.setState({ isLoading: false, password: val });
            });
            _this.accountStore.getPool('passwordrepeat').onValue(function (val) {
                _this.setState({ isLoading: false, passwordrepeat: val });
            });
            _this.accountStore.getPool('roles').onValue(function (val) {
                _this.setState({ isLoading: false, roles: val });
            });
        };
        _this.onChangeAccount = function (e) {
            var el = e.target;
            _this.plugValueToAccountStore(el.name, el.value);
        };
        _this.plugValueToAccountStore = function (poolName, value) {
            _this.accountStore.getPool(poolName).plug(Kefir.constant(value));
        };
        _this.plugInitialValuesIntoAccountStore = function (account) {
            _this.accountStore.getPool('principal').plug(Kefir.constant(account.isNothing ? INITIAL_NULL_VALUE : account.get().principal));
            _this.accountStore.getPool('password').plug(Kefir.constant(INITIAL_NULL_VALUE));
            _this.accountStore.getPool('passwordrepeat').plug(Kefir.constant(INITIAL_NULL_VALUE));
            _this.accountStore.getPool('roles').plug(Kefir.constant(account.isNothing ? INITIAL_NULL_VALUE : account.get().roles));
        };
        _this.renderNewAccountForm = function (existingAccount) {
            var create = existingAccount.isNothing;
            return react_1.DOM.div({ className: 'account-manager-component__create-account-panel' }, Panel({ header: create ? 'New Account' : 'Update Account' }, react_1.DOM.form({
                key: 'account-panel',
                onSubmit: create ? _this.onSubmitCreateAccount : _this.onSubmitUpdateAccount,
            }, FormGroup({ controlId: 'principal' }, ControlLabel({}, 'Principal'), Input({
                name: 'principal', type: 'text', placeholder: 'Unique username',
                disabled: !create, value: _this.state.principal, onChange: _this.onChangeAccount,
            })), FormGroup({ controlId: 'password' }, ControlLabel({}, 'Password'), Input({
                name: 'password', type: 'password', placeholder: 'Password',
                value: _this.state.password, onChange: _this.onChangeAccount,
            })), FormGroup({ controlId: 'passwordrepeat' }, ControlLabel({}, 'Repeat Password'), Input({
                name: 'passwordrepeat', type: 'password', placeholder: 'Repeat Password',
                value: _this.state.passwordrepeat, onChange: _this.onChangeAccount,
            })), react_1.DOM.div({
                key: 'role-selector-container',
                className: 'account-manager-component__role-multi-selector',
            }, [
                react_1.DOM.label({ key: 'control-label', className: 'control-label' }, 'Roles'),
                react_1.DOM.div({ key: 'role-multi-selector' }, RoleMultiSelectorComponent_1.default({
                    initialRoles: maybe.Just(_this.state.roles),
                    inputName: 'roles',
                    onChangeCallback: _this.plugValueToAccountStore,
                })),
            ]), react_1.DOM.div({ key: 'alert' }, react_1.createElement(alert_1.Alert, _this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' }))), react_1.DOM.div({
                key: 'create-account-btn',
                className: 'account-manager-component__create-account-btn',
            }, Btn({
                type: 'submit', bsSize: 'small',
                bsStyle: 'primary', disabled: _this.submitDisabled(),
            }, create ? 'Create' : 'Update'))), (create
                ? null
                : Btn({
                    key: 'delete-account-btn',
                    type: 'submit', bsSize: 'small',
                    bsStyle: 'primary', onClick: _this.onClickDeleteAccount,
                }, 'Delete'))));
        };
        _this.submitDisabled = function () {
            return _this.state.updateAccount.isNothing;
        };
        _this.onClickDeleteAccount = function () {
            security_1.Util.deleteAccount(_this.props.selectedAccount.get())
                .onValue(function (val) { return _this.props.refreshCallback(); })
                .onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    alert: maybe.Just(alert_1.Error(err)),
                });
            });
        };
        _this.onSubmitUpdateAccount = function (e) {
            e.stopPropagation();
            e.preventDefault();
            _this.state.updateAccount.map(function (account) {
                return security_1.Util.updateAccount(account)
                    .onValue(function (val) { return _this.props.refreshCallback(); })
                    .onError(function (err) {
                    return _this.setState({
                        isLoading: false,
                        alert: maybe.Just(alert_1.Error(err)),
                    });
                });
            });
        };
        _this.onSubmitCreateAccount = function (e) {
            e.stopPropagation();
            e.preventDefault();
            _this.state.updateAccount.map(function (account) {
                return security_1.Util.createAccount(account)
                    .onValue(function (val) { return _this.props.refreshCallback(); })
                    .onError(function (err) {
                    return _this.setState({
                        isLoading: false,
                        alert: maybe.Just(alert_1.Error(err)),
                    });
                });
            });
        };
        _this.state = {
            isLoading: false,
            updateAccount: maybe.Nothing(),
            alert: maybe.Nothing(),
            principal: '',
            password: '',
            passwordrepeat: '',
        };
        return _this;
    }
    AccountFormComponent.prototype.render = function () {
        return this.state.isLoading
            ? react_1.createElement(spinner_1.Spinner)
            : this.renderNewAccountForm(this.props.selectedAccount);
    };
    AccountFormComponent.prototype.componentDidMount = function () {
        this.initStore();
        this.plugInitialValuesIntoAccountStore(this.props.selectedAccount);
    };
    AccountFormComponent.prototype.componentWillReceiveProps = function (nextProps) {
        this.plugInitialValuesIntoAccountStore(nextProps.selectedAccount);
    };
    return AccountFormComponent;
}(react_1.Component));
var AccountForm = react_1.createFactory(AccountFormComponent);
exports.default = AccountForm;
