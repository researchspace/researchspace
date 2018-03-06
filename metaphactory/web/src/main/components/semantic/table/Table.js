Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var GriddleReact = require("griddle-react");
var _ = require("lodash");
var maybe = require("data.maybe");
var assign = require("object-assign");
var RdfValueDisplay_1 = require("platform/components/utils/RdfValueDisplay");
var rdf_1 = require("platform/api/rdf");
var template_1 = require("platform/components/ui/template");
var Pagination_1 = require("./Pagination");
require("./Table.scss");
var Griddle = react_1.createFactory(GriddleReact);
function isSimpleColumnConfig(config) {
    return _.has(config, 'variableName');
}
function isCustomColumnConfig(config) {
    return _.has(config, 'cellTemplate');
}
var CustomRow = (function (_super) {
    tslib_1.__extends(CustomRow, _super);
    function CustomRow(props, context) {
        return _super.call(this, props, context) || this;
    }
    CustomRow.prototype.render = function () {
        return react_1.createElement(template_1.TemplateItem, {
            template: {
                source: !_.isUndefined(this.props.metadataColumns[1]) ?
                    this.props.metadataColumns[1].template : 'No Template defined',
                options: this.props.data,
            },
        });
    };
    return CustomRow;
}(react_1.Component));
exports.CustomRow = CustomRow;
var DEFAULT_ROWS_PER_PAGE = 10;
var Table = (function (_super) {
    tslib_1.__extends(Table, _super);
    function Table(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderTableData = function (config, data) {
            var paginationProps = {
                externalCurrentPage: config.currentPage,
                onPageChange: config.onPageChange,
            };
            var griddleProps = {
                resultsPerPage: config.numberOfDisplayedRows.getOrElse(DEFAULT_ROWS_PER_PAGE),
                showFilter: true,
                useGriddleStyles: false,
                tableClassName: 'table',
                sortAscendingComponent: react_1.DOM.span({ className: 'fa fa-sort-alpha-asc' }),
                sortDescendingComponent: react_1.DOM.span({ className: 'fa fa-sort-alpha-desc' }),
                useCustomPagerComponent: true,
                customPagerComponent: Pagination_1.Pagination,
                customPagerComponentOptions: paginationProps,
            };
            var griddleConfig = data.fold(function (json) { return _this.getGriddlePropsForFlatDataArray(json, config, griddleProps); }, function (res) {
                return _this.getGriddlePropsForSparqlResult(res, config, griddleProps);
            });
            var griddleWithOptions = config.layout.map(function (l) { return assign({}, griddleConfig, l.options); }).getOrElse(griddleConfig);
            var griddleWithLayout = config.layout.chain(function (l) { return l.tupleTemplate; }).map(function (tupleTemplate) { return _this.useCustomLayout(griddleWithOptions, tupleTemplate); }).getOrElse(griddleWithOptions);
            return Griddle(griddleWithLayout);
        };
        _this.getGriddlePropsForSparqlResult = function (data, config, griddleProps) {
            var columnsMetadata = _this.buildColumnsMetadata(data.head.vars, config);
            return assign({}, griddleProps, {
                results: _this.prepareSparqlResultData(data, config),
                columns: _(columnsMetadata).filter('visible').map('columnName').value(),
                columnMetadata: columnsMetadata,
            });
        };
        _this.getGriddlePropsForFlatDataArray = function (data, config, griddleProps) {
            var heads = _.reduce(data, function (union, obj) { return _.union(union, Object.keys(obj)); }, []);
            var columnsMetadata = _this.buildColumnsMetadata(heads, config);
            return assign({}, griddleProps, {
                results: _this.prepareFlatData(data, config),
                columns: _(columnsMetadata).filter('visible').map('columnName').value(),
                columnMetadata: columnsMetadata,
            });
        };
        _this.useCustomLayout = function (griddleProps, tupleTemplate) {
            return assign({}, griddleProps, {
                useCustomRowComponent: true,
                customRowComponentClassName: 'griddle-custom-row',
                customRowComponent: CustomRow,
                metadataColumns: [
                    {
                        template: tupleTemplate,
                    },
                ],
            });
        };
        _this.prepareFlatData = function (data, config) {
            var additionalColumns = _this.getAdditionalColumns(config);
            _.forEach(data, function (x) {
                _.forEach(additionalColumns, function (column) {
                    x[column.displayName] = '';
                });
            });
            return data;
        };
        _this.prepareSparqlResultData = function (data, config) {
            var additionalColumns = _this.getAdditionalColumns(config);
            return _.each(data.results.bindings, function (binding) {
                _.forEach(data.head.vars, function (bindingVar) {
                    return binding[bindingVar] = binding[bindingVar] ? binding[bindingVar] : rdf_1.Rdf.literal('');
                });
                _.forEach(additionalColumns, function (c) {
                    binding[c.displayName] = rdf_1.Rdf.literal('');
                });
                return binding;
            });
        };
        _this.buildColumnsMetadata = function (vars, config) {
            if (_.isEmpty(config.columnConfiguration)) {
                return _this.defaultColumnsMetadata(vars);
            }
            else {
                return _this.customColumnsMetadata(config);
            }
        };
        _this.defaultColumnsMetadata = function (vars) {
            return _.map(vars, function (k, num) {
                return {
                    displayName: k,
                    columnName: k,
                    visible: true,
                    order: num,
                    customComponent: _this.cellTemplateClass(undefined, _this.props.layout.map(function (l) { return l.showLabels; }).getOrElse(true)),
                };
            });
        };
        _this.customColumnsMetadata = function (config) {
            return _.map(config.columnConfiguration, function (columnConfig, i) {
                var columnName = isSimpleColumnConfig(columnConfig)
                    ? columnConfig.variableName
                    : columnConfig.displayName;
                return {
                    columnName: columnName,
                    displayName: columnConfig.displayName,
                    customComponent: _this.cellComponentClass(columnConfig),
                    visible: true,
                    order: i,
                };
            });
        };
        _this.cellComponentClass = function (columnConfig) {
            if (columnConfig.cellComponent) {
                return columnConfig.cellComponent;
            }
            else {
                return _this.cellTemplateClass(isCustomColumnConfig(columnConfig) ? columnConfig.cellTemplate : undefined);
            }
        };
        _this.getAdditionalColumns = function (config) {
            return _.filter(config.columnConfiguration, function (c) { return isSimpleColumnConfig(c) === false; });
        };
        _this.cellTemplateClass = function (template, showLabel) {
            return react_1.createClass({
                template: _.isString(template) ? String(template) : undefined,
                showLabel: showLabel,
                render: function () {
                    if (_.isUndefined(this.template) === false) {
                        return react_1.createElement(template_1.TemplateItem, {
                            template: {
                                source: this.template,
                                options: this.props.rowData,
                            },
                        });
                    }
                    else {
                        return this.isPrimitiveDatatype(this.props.data) ? react_1.DOM.span({}, this.props.data) :
                            react_1.createElement(RdfValueDisplay_1.RdfValueDisplay, {
                                data: this.props.data,
                                showLabel: this.showLabel,
                            });
                    }
                },
                isPrimitiveDatatype: function (data) {
                    return _.isString(this.props.data)
                        || _.isBoolean(this.props.data)
                        || _.isNumber(this.props.data)
                        || _.isNull(this.props.data)
                        || _.isUndefined(this.props.data);
                },
            });
        };
        _this.state = {
            isLoading: true,
            layout: {
                tupleTemplate: maybe.Nothing(),
                showLabels: true,
            },
        };
        return _this;
    }
    Table.prototype.render = function () {
        return react_1.DOM.div({
            className: 'metaphacts-table-widget-holder',
        }, this.renderTableData(this.props, this.props.data));
    };
    return Table;
}(react_1.Component));
exports.Table = Table;
exports.default = Table;
