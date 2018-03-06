Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var _ = require("lodash");
var Maybe = require("data.maybe");
var moment = require("moment");
var reactDatetime = require("react-datetime");
var DateTimePicker = React.createFactory(reactDatetime);
var rdf_1 = require("platform/api/rdf");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var ArgumentsApi_1 = require("./ArgumentsApi");
var PlaceSelectionConfig = {
    placeholder: 'Search for Location...',
    parentsQuery: "\n    SELECT DISTINCT ?item ?parent ?parentLabel WHERE {\n      ?parent skos:inScheme <http://collection.britishmuseum.org/id/place> .\n      ?item skos:broader ?parent .\n      ?parent skos:prefLabel ?parentLabel .\n    }\n  ",
    childrenQuery: "\n    SELECT DISTINCT ?item ?label ?hasChildren WHERE {\n      ?item skos:broader ?parent .\n      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .\n      ?item skos:prefLabel ?label .\n      OPTIONAL { ?child skos:broader ?item . }\n      BIND(bound(?child) as ?hasChildren)\n    } ORDER BY ?label\n  ",
    rootsQuery: "\n    SELECT DISTINCT ?item ?label WHERE {\n      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .\n      FILTER NOT EXISTS { ?item skos:broader ?parent . }\n      ?item skos:prefLabel ?label .\n    }\n  ",
    searchQuery: "\n    SELECT DISTINCT ?item ?label ?score ?hasChildren WHERE {\n      ?item skos:inScheme <http://collection.britishmuseum.org/id/place> .\n      ?item skos:prefLabel ?label.\n      ?label bds:search ?__token__ ;\n             bds:minRelevance \"0.3\" ;\n             bds:relevance ?score ;\n             bds:matchAllTerms \"true\"  .\n      OPTIONAL { ?child skos:broader ?item. }\n      BIND(BOUND(?child) AS ?hasChildren)\n    }\n    ORDER BY DESC(?score) ?label\n    LIMIT 200\n",
};
var OUTPUT_UTC_DATE_FORMAT = 'YYYY-MM-DD';
var OUTPUT_UTC_TIME_FORMAT = 'HH:mm:ss';
var ObservationComponent = (function (_super) {
    tslib_1.__extends(ObservationComponent, _super);
    function ObservationComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onTitleChange = function (event) {
            return _this.setState({ title: event.target.value });
        };
        _this.onNoteChange = function (event) {
            return _this.setState({ note: event.target.value });
        };
        _this.onDateSelected = function (date) {
            return _this.setState({ date: rdf_1.Rdf.literal(date.format(), rdf_1.vocabularies.xsd.dateTime) });
        };
        _this.onPlaceSelected = function (selection) {
            return _this.setState({
                place: lazy_tree_1.TreeSelection.leafs(selection).map(function (node) { return node.iri; }).first()
            });
        };
        _this.canSave = function () {
            var _a = _this.state, title = _a.title, note = _a.note, place = _a.place, date = _a.date;
            return !_.isEmpty(title) && place && date;
        };
        _this.saveArgument = function () {
            var _a = _this.state, title = _a.title, note = _a.note, place = _a.place, date = _a.date, iri = _a.iri;
            _this.props.onSave({
                iri: iri,
                argumentType: ArgumentsApi_1.ObservationType,
                title: title, note: note, place: place,
                date: date,
            });
        };
        if (props.initialState) {
            _this.state = props.initialState;
        }
        else {
            _this.state = {
                iri: Maybe.Nothing(),
                title: '',
                note: '',
                place: null,
                date: null,
            };
        }
        return _this;
    }
    ObservationComponent.prototype.render = function () {
        return React.createElement(react_bootstrap_1.Panel, { header: 'Premise based on direct observation' },
            React.createElement(react_bootstrap_1.Form, { horizontal: true },
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Title*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { type: 'text', placeholder: 'Observation title...', value: this.state.title, onChange: this.onTitleChange }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Description"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(react_bootstrap_1.FormControl, { componentClass: 'textarea', placeholder: 'Observation description...', value: this.state.note, onChange: this.onNoteChange }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Date*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(DateTimePicker, { onChange: this.onDateSelected, closeOnSelect: true, value: this.state.date ? moment(this.state.date.value) : undefined, viewMode: 'time', dateFormat: OUTPUT_UTC_DATE_FORMAT, timeFormat: OUTPUT_UTC_TIME_FORMAT, inputProps: { placeholder: 'Select observation date...' } }))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { componentClass: react_bootstrap_1.ControlLabel, sm: 2 }, "Place*"),
                    React.createElement(react_bootstrap_1.Col, { sm: 10 },
                        React.createElement(lazy_tree_1.SemanticTreeInput, tslib_1.__assign({}, PlaceSelectionConfig, { initialSelection: this.state.place ? [this.state.place] : [], onSelectionChanged: this.onPlaceSelected })))),
                React.createElement(react_bootstrap_1.FormGroup, null,
                    React.createElement(react_bootstrap_1.Col, { smOffset: 2, sm: 10 },
                        React.createElement(react_bootstrap_1.ButtonGroup, { className: 'pull-right' },
                            React.createElement(react_bootstrap_1.Button, { bsStyle: 'danger', onClick: this.props.onCancel }, "Cancel"),
                            React.createElement(react_bootstrap_1.Button, { bsStyle: 'success', style: { marginLeft: '12px' }, onClick: this.saveArgument, disabled: !this.canSave() }, "Save"))))));
    };
    return ObservationComponent;
}(React.Component));
exports.ObservationComponent = ObservationComponent;
