Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var Either = require("data.either");
var security_1 = require("platform/api/services/security");
var table_1 = require("platform/components/semantic/table");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var AccountFormComponent_1 = require("./AccountFormComponent");
require("./RealmManager.scss");
var AccountManagerComponent = (function (_super) {
    tslib_1.__extends(AccountManagerComponent, _super);
    function AccountManagerComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.getRowClass = function (account) {
            if (_this.state.selectedAccount.isNothing) {
                return '';
            }
            return account.principal === _this.state.selectedAccount.get().principal ? 'bg-success' : '';
        };
        _this.onRowClick = function (e) {
            var account = e.props['data'];
            var stateAccount = _this.state.selectedAccount.map(function (currentSelected) {
                return currentSelected.principal === account.principal
                    ? maybe.Nothing()
                    : maybe.Just(account);
            }).getOrElse(maybe.Just(account));
            _this.setState({
                isLoading: false,
                selectedAccount: stateAccount,
            });
        };
        _this.fetchAccounts = function () {
            _this.setState({
                isLoading: true,
                selectedAccount: maybe.Nothing(),
            });
            security_1.Util.getAllAccounts().onValue(function (accounts) {
                return _this.setState({
                    isLoading: false,
                    data: maybe.Just(accounts),
                });
            }).onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    err: maybe.Just(err),
                });
            });
        };
        _this.state = {
            isLoading: true,
            data: maybe.Nothing(),
            selectedAccount: maybe.Nothing(),
            err: maybe.Nothing(),
        };
        return _this;
    }
    AccountManagerComponent.prototype.render = function () {
        if (this.state.err.isJust) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.state.err.get() } });
        }
        if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        return react_1.DOM.div({}, this.renderAccountTable(), AccountFormComponent_1.default({
            selectedAccount: this.state.selectedAccount,
            refreshCallback: this.fetchAccounts,
        }));
    };
    AccountManagerComponent.prototype.componentWillMount = function () {
        this.fetchAccounts();
    };
    AccountManagerComponent.prototype.renderAccountTable = function () {
        var griddleOptions = {
            onRowClick: this.onRowClick.bind(this),
            rowMetadata: { 'bodyCssClassName': this.getRowClass },
        };
        return react_1.DOM.div({}, react_1.createElement(table_1.Table, {
            layout: maybe.Just({
                options: griddleOptions,
                tupleTemplate: maybe.Nothing(),
            }),
            numberOfDisplayedRows: maybe.Just(10),
            data: Either.Left(this.state.data.get()),
            columnConfiguration: [
                { variableName: 'principal', displayName: 'User Principal' },
                { variableName: 'roles', displayName: 'Roles' },
                { variableName: 'permissions', displayName: 'Permissions' },
            ],
        }));
    };
    return AccountManagerComponent;
}(react_1.Component));
var AccountManager = react_1.createFactory(AccountManagerComponent);
exports.default = AccountManager;
