Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var React = require("react");
var assign = require("object-assign");
var maybe = require("data.maybe");
var Kefir = require("kefir");
var _ = require("lodash");
var ReactBootstrap = require("react-bootstrap");
var ReactDropzone = require("react-dropzone");
var sparql_1 = require("platform/api/sparql");
var forms_1 = require("platform/components/forms");
var alert_1 = require("platform/components/ui/alert");
var file_upload_1 = require("platform/api/services/file-upload");
var Dropzone = React.createFactory(ReactDropzone);
var ProgressBar = React.createFactory(ReactBootstrap.ProgressBar);
var FORM_FIELDS = [
    { 'id': 'title', 'label': 'Title', 'minOccurs': 1, 'maxOccurs': 1, 'xsdDatatype': 'xsd:string' },
    { 'id': 'person', 'label': 'Digitized By', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix owl: <http://www.w3.org/2002/07/owl#>\n    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>\n\n    SELECT DISTINCT ?value ?label ?type WHERE {\n      ?value rso:displayLabel ?label .\n      ?value rdf:type ?type .\n      ?type rdfs:subClassOf* crm:E39_Actor .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
    { 'id': 'date', 'label': 'Date', 'maxOccurs': 1, 'xsdDatatype': 'xsd:dateTime' },
    { 'id': 'type', 'label': 'Type', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'valueSetPattern': "select ?value ?label where {\n      values(?value ?label) {\n        (<http://collection.britishmuseum.org/id/thesauri/imgtype/scan> 'Scan')\n        (<http://collection.britishmuseum.org/id/thesauri/imgtype/2d> '2D')\n        (<http://collection.britishmuseum.org/id/thesauri/imgtype/3d> '3D')\n       }\n     }\n      ",
    },
    { 'id': 'owner', 'label': 'Owner', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix owl: <http://www.w3.org/2002/07/owl#>\n    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>\n\n    SELECT DISTINCT ?value ?label ?type WHERE {\n      ?value rso:displayLabel ?label .\n      ?value rdf:type ?type .\n      ?type rdfs:subClassOf* crm:E39_Actor .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
    { 'id': 'copyright', label: 'Copyright', 'maxOccurs': 1, 'xsdDatatype': 'xsd:string' },
    { 'id': 'description', label: 'Description', 'maxOccurs': 1, 'xsdDatatype': 'xsd:string' },
    { 'id': 'scientificType', label: 'Scientific Type', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'valueSetPattern': "select ?value ?label where {\n      values(?value ?label) {\n        (<http://collection.britishmuseum.org/id/thesauri/scitype/xray> 'X-Ray')\n        (<http://collection.britishmuseum.org/id/thesauri/scitype/uv> 'Ultra Violet')\n        (<http://collection.britishmuseum.org/id/thesauri/scitype/ir> 'Infra Red')\n        (<http://collection.britishmuseum.org/id/thesauri/scitype/color> 'Visible light')\n      }\n    }",
    },
    { 'id': 'width', label: 'Width', 'maxOccurs': 1, 'xsdDatatype': 'xsd:decimal' },
    { 'id': 'height', label: 'Height', 'maxOccurs': 1, 'xsdDatatype': 'xsd:decimal' },
    { 'id': 'unit', label: 'Unit', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'valueSetPattern': "select ?value ?label where {\n      values(?value ?label) {\n        (<http://collection.britishmuseum.org/id/thesauri/unit/mm> 'Millimeters')\n        (<http://collection.britishmuseum.org/id/thesauri/unit/px> 'Pixels')\n      }\n    }",
    },
    { 'id': 'depicts', 'label': 'Depicts', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n\n    SELECT DISTINCT ?value ?label WHERE {\n      ?value a rso:Concept;\n        rso:displayLabel ?label .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
    { 'id': 'subjects', 'label': 'Carries subject', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix owl: <http://www.w3.org/2002/07/owl#>\n    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>\n\n    SELECT DISTINCT ?value ?label ?type WHERE {\n      ?value rso:displayLabel ?label .\n      ?value rdf:type ?type .\n      ?type rdfs:subClassOf* crm:E24_Physical_Man-Made_Thing .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
    { 'id': 'refers', 'label': 'Refers To', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n\n    SELECT DISTINCT ?value ?label WHERE {\n      ?value rso:displayLabel ?label .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
    { 'id': 'about', 'label': 'Is about', 'maxOccurs': 1, 'xsdDatatype': 'xsd:anyURI',
        'autosuggestionPattern': "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    prefix bds: <http://www.bigdata.com/rdf/search#>\n    prefix rso: <http://www.researchspace.org/ontology/>\n\n    SELECT DISTINCT ?value ?label WHERE {\n      ?value rso:displayLabel ?label .\n      SERVICE <http://www.bigdata.com/rdf/search#search> {\n        ?label bds:search '*?token*' ;\n          bds:relevance ?score .\n      }\n    } ORDER BY ?score",
    },
];
var ImageUploadWidget = (function (_super) {
    tslib_1.__extends(ImageUploadWidget, _super);
    function ImageUploadWidget(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            files: [],
        };
        return _this;
    }
    ImageUploadWidget.prototype.componentDidMount = function () {
        var _this = this;
        this.messages = Kefir.pool();
        this.messages.onValue(function (v) {
            var message = _this.state.alertState ? _this.state.alertState.message : '';
            _this.setState(assign({}, _this.state, {
                alertState: {
                    alert: alert_1.AlertType.WARNING,
                    message: message + v,
                },
            }));
        });
    };
    ImageUploadWidget.prototype.onDrop = function (files) {
        this.setState(assign({}, this.state, { files: files }));
    };
    ImageUploadWidget.prototype.submit = function (fieldValues) {
        var _this = this;
        if (this.state.files.length === 0) {
            this.messages.plug(Kefir.constant('You have selected no images.<br>'));
            return;
        }
        var title = fieldValues.fields.get('title');
        if (!title || title.values.size === 0) {
            this.messages.plug(Kefir.constant('Please fill in title to proceed with image upload.<br>'));
            return;
        }
        var file = this.state.files[0];
        var contentType = _.isEmpty(this.props.config) || _.isEmpty(this.props.config.contentType)
            ? file_upload_1.FileUploadService.getMimeType(file)
            : this.props.config.contentType;
        var createResourceQuery = sparql_1.SparqlUtil.serializeQuery(parametrizeQueryWithFormValues(this.props.config.createResourceQuery, fieldValues));
        return file_upload_1.FileUploadService.uploadFile({
            createResourceQuery: createResourceQuery,
            generateIdQuery: this.props.config.generateIdQuery,
            storage: this.props.config.storage,
            metadataExtractor: this.props.config.metadataExtractor,
            contextUri: this.props.config.contextUri,
            file: file,
            contentType: contentType,
            onProgress: function (percent) { return _this.setState(assign({}, _this.state, {
                progress: percent,
            })); },
        }).map(function (newImageIri) {
            _this.messages.plug(Kefir.constant('File: ' + file.name + ' uploaded.<br/>'));
            window.location.reload();
        }).mapErrors(function (error) {
            return _this.messages.plug(Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>'));
        }).toProperty();
    };
    ImageUploadWidget.prototype.render = function () {
        var _this = this;
        var progress = maybe.fromNullable(this.state.progress);
        var description = _.isEmpty(this.props.config) || _.isEmpty(this.props.config.description)
            ? 'Please drag & drop your image file here or click to browse the file system.'
            : this.props.config.description;
        return react_1.DOM.div({ className: 'iiif-upload__holder' }, this.state.alertState ? react_1.createElement(alert_1.Alert, this.state.alertState) : null, progress.map(function (progress) { return ProgressBar({ active: true, min: 0, max: 100, now: progress }); }).getOrElse(null), Dropzone({
            className: 'iiif-upload__dropzone',
            onDrop: this.onDrop.bind(this),
            multiple: false,
        }, react_1.DOM.div({ className: 'iiif-upload__description' }, react_1.DOM.p({}, description)), react_1.DOM.button({
            className: 'iiif-upload__dropzone-button btn btn-sm btn-default',
        }, 'Browse')), this.state.files.map(function (file) { return react_1.DOM.h4({ key: file.name }, 'Selected file: ' + file.name); }), react_1.createElement(forms_1.ResourceEditorForm, {
            fields: FORM_FIELDS,
            persistence: {
                persist: function (intialModel, model) { return _this.submit(model); },
            },
        }, React.createElement(forms_1.PlainTextInput, { for: 'title', placeholder: 'Type title here' }), React.createElement(forms_1.AutocompleteInput, { for: 'person' }), React.createElement(forms_1.DatePickerInput, { for: 'date', mode: 'date' }), React.createElement(forms_1.SelectInput, { for: 'type' }), React.createElement(forms_1.AutocompleteInput, { for: 'owner' }), React.createElement(forms_1.PlainTextInput, { for: 'copyright' }), React.createElement(forms_1.PlainTextInput, { for: 'description', multiline: true }), React.createElement(forms_1.SelectInput, { for: 'scientificType' }), React.createElement(forms_1.PlainTextInput, { for: 'width' }), React.createElement(forms_1.PlainTextInput, { for: 'height' }), React.createElement(forms_1.SelectInput, { for: 'unit' }), React.createElement(forms_1.AutocompleteInput, { for: 'depicts' }), React.createElement(forms_1.AutocompleteInput, { for: 'subjects' }), React.createElement(forms_1.AutocompleteInput, { for: 'refers' }), React.createElement(forms_1.AutocompleteInput, { for: 'about' }), react_1.DOM.button({ className: 'btn btn-sm btn-success iiif-upload__submit-button pull-right', name: 'submit' }, 'Submit'), react_1.DOM.button({
            style: { marginRight: 12 },
            className: 'btn btn-sm btn-danger iiif-upload__cancel-button pull-right',
            onClick: function () { return window.location.reload(); },
        }, 'Cancel')), this.state.alertState ? react_1.createElement(alert_1.Alert, this.state.alertState) : null, progress.map(function (progress) { return ProgressBar({ active: true, min: 0, max: 100, now: progress }); }).getOrElse(null));
    };
    return ImageUploadWidget;
}(react_1.Component));
function parametrizeQueryWithFormValues(createResourceQuery, fieldValues) {
    var initialQuery = sparql_1.SparqlUtil.parseQuery(createResourceQuery);
    if (initialQuery.type !== 'query') {
        throw new Error('createResourceQuery must be a SELECT or CONSTRUCT query');
    }
    var resultQuery = fieldValues.fields.reduce(function (query, _a, fieldId) {
        var values = _a.values;
        var bindings = values
            .filter(forms_1.FieldValue.isAtomic)
            .map(forms_1.FieldValue.asRdfNode)
            .map(function (value) {
            return (_a = {}, _a[fieldId] = value, _a);
            var _a;
        })
            .toArray();
        return sparql_1.SparqlClient.prepareParsedQuery(bindings)(query);
    }, initialQuery);
    return resultQuery;
}
exports.c = ImageUploadWidget;
exports.f = React.createFactory(exports.c);
exports.default = exports.c;
