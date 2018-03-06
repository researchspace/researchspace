Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var navigation_1 = require("platform/api/navigation");
var FieldDefinition_1 = require("./FieldDefinition");
var QueryValues_1 = require("./QueryValues");
var FieldBasedVisualization = (function (_super) {
    tslib_1.__extends(FieldBasedVisualization, _super);
    function FieldBasedVisualization(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            fieldsData: [],
            isLoading: false,
        };
        return _this;
    }
    FieldBasedVisualization.prototype.componentDidMount = function () {
        this.fetchFieldValues();
    };
    FieldBasedVisualization.prototype.render = function () {
        return this.state.isLoading ? react_1.createElement(spinner_1.Spinner) : this.renderResult();
    };
    FieldBasedVisualization.prototype.renderResult = function () {
        return react_1.createElement(template_1.TemplateItem, {
            template: {
                source: this.props.template,
                options: {
                    subject: this.props.subject,
                    fields: this.state.fieldsData,
                },
            },
        });
    };
    FieldBasedVisualization.prototype.fetchFieldValues = function () {
        var _this = this;
        var _a = this.props, fields = _a.fields, subject = _a.subject;
        var subjectIri = rdf_1.Rdf.iri(subject);
        Kefir.combine(fields.map(FieldDefinition_1.normalizeFieldDefinition).map(function (field) { return QueryValues_1.queryValues(field.selectPattern, subjectIri, { context: _this.context.semanticContext }).map(function (values) {
            var f = _.cloneDeep(field);
            var fieldValues = values.map(function (x) { return x.value; });
            f.values = _.isEmpty(fieldValues) ? null : fieldValues;
            return f;
        }); })).onValue(function (values) { return _this.setState({ fieldsData: values }); });
    };
    return FieldBasedVisualization;
}(components_1.Component));
FieldBasedVisualization.defaultProps = {
    subject: navigation_1.getCurrentResource().value
};
exports.FieldBasedVisualization = FieldBasedVisualization;
exports.default = FieldBasedVisualization;
