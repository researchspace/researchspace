Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Maybe = require("data.maybe");
var _ = require("lodash");
var Kefir = require("kefir");
var ReactSelect = require("react-select");
var sparql_1 = require("platform/api/sparql");
var FieldUtils_1 = require("./FieldUtils");
var repository_1 = require("platform/api/services/repository");
function isMultiSelection(props) {
    return props.multiSelection;
}
var FieldSelection = (function (_super) {
    tslib_1.__extends(FieldSelection, _super);
    function FieldSelection(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.repositories = repository_1.getRepositoryStatus().map(function (repos) { return repos.keySeq().toArray(); });
        _this.fieldsSelection = function (fields) {
            return React.createElement("div", { style: { height: 400 } },
                React.createElement(ReactSelect, { ref: function (component) { return _this.fieldSelection = component; }, multi: _this.props.multiSelection, clearable: true, onChange: _this.onFieldSelectionChange(fields), options: fields.map(function (field) { return ({ value: field.iri, label: field.label }); }), value: _this.state.selectedFields, placeholder: _this.props.placeholder }));
        };
        _this.onFieldSelectionChange = function (fields) { return function (selected) {
            _this.fieldSelection.closeMenu();
            _this.setState({ selectedFields: selected });
            if (isMultiSelection(_this.props)) {
                var multiSelectd_1 = selected;
                var selectedFields = fields.filter(function (field) { return _.some(multiSelectd_1, function (_a) {
                    var value = _a.value;
                    return field.iri === value;
                }); });
                _this.props.onSave(selectedFields);
            }
            else {
                var selectedField = fields.find(function (field) { return selected.value === field.iri; });
                _this.props.onSave(selectedField);
            }
        }; };
        _this.fetchFields = function (props) {
            var subject = props.subject, record = props.record, types = props.types;
            _this.setState({ fields: Maybe.Nothing() });
            _this.getExistingFieldsForRecord(subject, record, types).onValue(function (fields) { return _this.setState({ fields: Maybe.Just(fields) }); });
        };
        _this.getExistingFieldsForRecord = function (subject, record, types) {
            var allFields = _this.getFieldsForRecord(record, types);
            return allFields.flatMap(function (fields) { return Kefir.combine(fields.map(function (field) { return _this.checkField(field)
                .map(function (check) { return [field, check]; }); })); }).map(function (fields) { return fields.filter(function (_a) {
                var check = _a[1];
                return check;
            }).map(function (_a) {
                var field = _a[0];
                return field;
            }); }).toProperty();
        };
        _this.checkField = function (field) {
            return _this.repositories.flatMap(function (repos) {
                return Kefir.combine(repos.map(function (repo) { return _this.executeFieldTestForRepository(field, repo); }));
            }).map(_.some).toProperty();
        };
        _this.executeFieldTestForRepository = function (field, repository) {
            var query = sparql_1.SparqlUtil.parseQuerySync(field.selectPattern);
            var askQuery = {
                prefixes: query.prefixes,
                type: 'query',
                queryType: 'ASK',
                where: query.where,
            };
            return sparql_1.SparqlClient.ask(sparql_1.SparqlClient.setBindings(askQuery, { 'subject': _this.props.subject }), { context: { repository: repository } });
        };
        _this.FIELDS_QUERY = (_a = ["\n    SELECT ?field { ?field <http://www.metaphacts.com/ontology/fields#domain> ?__type__ }\n  "], _a.raw = ["\n    SELECT ?field { ?field <http://www.metaphacts.com/ontology/fields#domain> ?__type__ }\n  "], sparql_1.SparqlUtil.Sparql(_a));
        _this.getFieldsForRecord = function (record, types) {
            var fieldIris = sparql_1.SparqlClient.select(sparql_1.SparqlClient.prepareParsedQuery(types.map(function (type) { return ({ '__type__': type }); }))(_this.FIELDS_QUERY), { context: { repository: 'assets' } }).map(function (res) { return res.results.bindings.map(function (binding) { return binding['field']; }); });
            var fieldsData = fieldIris.flatMap(function (iris) { return Kefir.combine(iris.map(function (field) { return FieldUtils_1.getArgumentsFieldDefinition(field); })); });
            return fieldsData.toProperty();
        };
        _this.state = {
            fields: Maybe.Nothing(),
            selectedFields: []
        };
        return _this;
        var _a;
    }
    FieldSelection.prototype.componentDidMount = function () {
        this.fetchFields(this.props);
    };
    FieldSelection.prototype.componentWillReceiveProps = function (props) {
        if (!_.isEqual(props, this.props)) {
            this.fetchFields(props);
        }
    };
    FieldSelection.prototype.render = function () {
        var _this = this;
        var maybeFields = this.state.fields;
        return maybeFields.map(function (fields) {
            return _.isEmpty(fields) ? React.createElement("p", null, "'No applicable field for the record'") : _this.fieldsSelection(fields);
        }).getOrElse(React.createElement("p", null, "Loading fields ... "));
    };
    return FieldSelection;
}(React.Component));
exports.FieldSelection = FieldSelection;
