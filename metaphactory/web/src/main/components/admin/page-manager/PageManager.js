Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var _ = require("lodash");
var ReactBootstrap = require("react-bootstrap");
var Either = require("data.either");
var Kefir = require("kefir");
var moment = require("moment");
var fileSaver = require("file-saver");
var ReactSelectComponent = require("react-select");
var page_1 = require("platform/api/services/page");
var table_1 = require("platform/components/semantic/table");
var template_1 = require("platform/components/ui/template");
var alert_1 = require("platform/components/ui/alert");
var spinner_1 = require("platform/components/ui/spinner");
var ReactSelect = react_1.createFactory(ReactSelectComponent);
var Button = react_1.createFactory(ReactBootstrap.Button);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var FILTER;
(function (FILTER) {
    FILTER[FILTER["NONE"] = 0] = "NONE";
    FILTER[FILTER["ALL"] = 1] = "ALL";
    FILTER[FILTER["MODIFIEDTODAY"] = 2] = "MODIFIEDTODAY";
})(FILTER || (FILTER = {}));
var PageManager = (function (_super) {
    tslib_1.__extends(PageManager, _super);
    function PageManager(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.filterPages = function (v) {
            switch (v) {
                case FILTER.ALL:
                    _this.filterAll();
                    break;
                case FILTER.NONE:
                    _this.filterNone();
                    break;
                case FILTER.MODIFIEDTODAY:
                    _this.filterModifiedToday();
                    break;
                default: _this.filterNone();
            }
        };
        _this.filterAll = function () {
            var selected = {};
            _.forEach(_this.state.data, function (row) {
                selected[row['uri']] = row['date'];
            });
            _this.setState({
                selectedPages: selected,
                isLoading: false,
                filter: FILTER.ALL,
            });
        };
        _this.filterModifiedToday = function () {
            var selected = {};
            _.forEach(_this.state.data, function (row) {
                if (moment(row['date']).isSame(moment(), 'day')) {
                    selected[row['uri']] = row['date'];
                }
            });
            _this.setState({
                selectedPages: selected,
                isLoading: false,
                filter: FILTER.MODIFIEDTODAY,
            });
        };
        _this.filterNone = function () {
            _this.setState({
                selectedPages: {},
                isLoading: false,
                filter: FILTER.NONE,
            });
        };
        _this.getTable = function () {
            var columnConfig = [
                { variableName: 'uri',
                    displayName: 'Page',
                    cellTemplate: '<semantic-link uri=\'{{uri}}\' getlabel=false>{{uri}}</semantic-link>',
                },
                {
                    variableName: 'date',
                    displayName: 'Last Modified',
                    cellTemplate: '{{dateTimeFormat date \'LLL\'}}',
                },
            ];
            var griddleOptions = {
                onRowClick: _this.onChange.bind(_this),
                resultsPerPage: 10,
                rowMetadata: { 'bodyCssClassName': _this.getRowClass.bind(_this) },
            };
            var selectOptions = {
                className: 'dataset-selector__multi-select',
                multi: false,
                options: [
                    { value: FILTER.NONE, label: 'None' },
                    { value: FILTER.ALL, label: 'All' },
                    { value: FILTER.MODIFIEDTODAY, label: 'Modified today' },
                ],
                optionRenderer: function (o) { return o.label; },
                clearable: true,
                allowCreate: false,
                autoload: true,
                clearAllText: 'Remove all',
                clearValueText: 'Remove filter',
                delimiter: '|',
                disabled: false,
                ignoreCase: true,
                matchPos: 'any',
                matchProp: 'any',
                noResultsText: '',
                searchable: false,
                placeholder: 'Filter',
                onChange: _this.onFilter,
                value: _this.state.filter,
            };
            var rowStyle = {
                'display': 'flex',
                'alignItems': 'center',
                'marginTop': '10px',
            };
            return react_1.DOM.div({ className: 'mph-page-admin-widget', onChange: _this.onChange.bind(_this) }, react_1.createElement(table_1.Table, {
                ref: 'table-ref',
                key: 'table',
                numberOfDisplayedRows: maybe.Just(10),
                data: Either.Left(_this.state.data),
                columnConfiguration: columnConfig,
                layout: maybe.Just({ options: griddleOptions, tupleTemplate: maybe.Nothing() }),
            }), react_1.DOM.div({ className: 'row', style: rowStyle, key: 'selected-pages' }, react_1.DOM.div({ className: 'col-xs-2' }, 'Selected pages: '), react_1.DOM.div({ className: 'col-xs-4' }, react_1.DOM.b({}, _.size(_this.state.selectedPages)))), react_1.DOM.div({ className: 'row', style: rowStyle }, react_1.DOM.div({ className: 'col-xs-2', key: '1' }, 'Select pages: '), react_1.DOM.div({ className: 'col-xs-4', key: '2' }, ReactSelect(selectOptions))), react_1.createElement(alert_1.Alert, _this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' })), react_1.DOM.div({ className: 'row', style: rowStyle, key: 'actions' }, react_1.DOM.div({ className: 'col-xs-2' }), react_1.DOM.div({ className: 'col-xs-4' }, ButtonToolbar({}, Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: _this.onClickExportSelected,
            }, 'Export Selected'), Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                onClick: _this.onClickDeleteSelected,
            }, 'Delete Selected')))));
        };
        _this.onFilter = function (selected) {
            var value = _.isString(selected.value) ? FILTER.NONE : selected.value;
            _this.filterPool.plug(Kefir.constant(value));
        };
        _this.onClickDeleteSelected = function () {
            page_1.PageService.deleteTemplateRevisions(_this.state.selectedPages).onValue(function (success) {
                if (success) {
                    window.location.reload();
                }
            }).onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    alert: maybe.Just(alert_1.Error(err)),
                });
            });
        };
        _this.onClickExportSelected = function () {
            page_1.PageService.exportTemplateRevisions(_this.state.selectedPages).onValue(function (res) {
                var filename = '';
                var disposition = res.header['content-disposition'];
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    var filenameRegex = /filename[^;=\n]*=((['']).*?\2|[^;\n]*)/;
                    var matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['']/g, '');
                    }
                }
                var type = res.header['content-type'];
                var blob = new Blob([res['xhr']['response']], { type: type });
                fileSaver.saveAs(blob, filename);
            }).onError(function (err) {
                return _this.setState({
                    isLoading: false,
                    alert: maybe.Just(alert_1.Error(err)),
                });
            });
        };
        _this.getRowClass = function (data) {
            return _.isUndefined(_this.state.selectedPages[data['uri']])
                ? ''
                : 'bg-success';
        };
        _this.addOrRemoveSelectedURI = function (uri, date) {
            var selectedPages = _this.state.selectedPages;
            selectedPages[uri] = _.isUndefined(selectedPages[uri]) ? date : undefined;
            _this.setState({ isLoading: false, selectedPages: selectedPages });
        };
        _this.onChange = function (row) {
            if (_.isUndefined(row)) {
                return;
            }
            var uri = row['props']['data']['uri'];
            var date = row['props']['data']['date'];
            _this.addOrRemoveSelectedURI(uri, date);
        };
        _this.state = {
            isLoading: true,
            selectedPages: {},
            filter: FILTER.NONE,
            alert: maybe.Nothing(),
            err: maybe.Nothing(),
        };
        _this.filterPool = Kefir.pool();
        _this.filterPool.onValue(function (v) { return _this.filterPages(v); });
        return _this;
    }
    PageManager.prototype.render = function () {
        if (this.state.err.isJust) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.state.err.get() } });
        }
        if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        return this.getTable();
    };
    PageManager.prototype.componentWillMount = function () {
        var _this = this;
        page_1.PageService.getAllTemplateInfos().onValue(function (res) {
            _this.setState({
                isLoading: false,
                data: res,
            });
        }).onError(function (err) {
            return _this.setState({
                isLoading: false,
                err: maybe.Just(err),
            });
        });
    };
    return PageManager;
}(react_1.Component));
exports.PageManager = PageManager;
exports.default = PageManager;
