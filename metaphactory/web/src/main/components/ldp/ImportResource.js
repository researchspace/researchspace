Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var assign = require("object-assign");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var components_2 = require("platform/api/navigation/components");
var navigation_1 = require("platform/api/navigation");
var ldp_1 = require("platform/api/services/ldp");
var resource_label_1 = require("platform/components/ui/resource-label");
var Spinner_1 = require("platform/components/ui/spinner/Spinner");
var ImportResourceComponent = (function (_super) {
    tslib_1.__extends(ImportResourceComponent, _super);
    function ImportResourceComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.performPostAction = function (createdResource) {
            if (!_this.props.postAction || _this.props.postAction === 'reload') {
                navigation_1.refresh();
            }
            else if (_this.props.postAction === 'redirect') {
                navigation_1.navigateToResource(rdf_1.Rdf.iri(createdResource)).onValue(function (v) { return v; });
            }
            else {
                navigation_1.navigateToResource(rdf_1.Rdf.iri(_this.props.postAction)).onValue(function (v) { return v; });
            }
        };
        _this.importFromText = function (text) {
            _this.setState({ wait: true });
            var ldpService = _this.getLDPService();
            ldpService
                .importFromText(text, _this.props.container)
                .onValue(_this.onServerResponse)
                .onError(_this.onServerError);
        };
        _this.importFromURL = function (url) {
            var ldpService = _this.getLDPService();
            ldpService
                .importGetTextFromURL(url)
                .flatMap(function (text) {
                return ldpService.
                    importFromText(text, _this.props.container)
                    .onValue(_this.onServerResponse)
                    .onError(_this.onServerError);
            })
                .onError(_this.onServerError);
        };
        _this.importFromDelayedId = function (delayedId, containerIRI) {
            var ldpService = _this.getLDPService();
            ldpService
                .importFromDelayedId(delayedId, containerIRI)
                .onValue(_this.onServerResponse)
                .onError(_this.onServerError);
        };
        _this.onServerResponse = function (response) {
            if (response.status === 202) {
                _this.setState({ serverDialog: response.text });
            }
            else if (response.status === 201) {
                _this.setState({ serverDone: response.header['location'], wait: false });
            }
        };
        _this.onServerError = function (error) {
            console.error('Error during import: ' + JSON.stringify(error));
            _this.setState({ serverError: error, wait: false });
        };
        _this.state = {
            show: false,
            wait: false,
        };
        return _this;
    }
    ImportResourceComponent.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (!this.state.show && nextState.show) {
            this.refs['trigger'].show();
        }
        else if (this.state.show && !nextState.show) {
            this.refs['trigger'].hide();
        }
        return true;
    };
    ImportResourceComponent.prototype.getLDPService = function () {
        var ldpContext = this.context.semanticContext && this.context.semanticContext.repository ?
            { repository: this.context.semanticContext.repository } : {};
        return new ldp_1.LdpService('', ldpContext);
    };
    ImportResourceComponent.prototype.renderContainerList = function (selectedContainer, possibleContainers) {
        var _this = this;
        return React.createElement(react_bootstrap_1.FormGroup, null,
            "Select container to import into",
            React.createElement(react_bootstrap_1.FormGroup, null, possibleContainers.map(function (containerIRI) {
                return React.createElement(react_bootstrap_1.Radio, { name: 'select-container', value: containerIRI['@id'], checked: selectedContainer === containerIRI['@id'], onChange: function () { return _this.setState({ selectedContainer: containerIRI['@id'] }); } },
                    React.createElement("span", { title: containerIRI['@id'] },
                        React.createElement(resource_label_1.ResourceLabel, { iri: containerIRI['@id'] })));
            })));
    };
    ImportResourceComponent.prototype.renderContainerMessage = function (selectedContainer, possibleContainers, isPropsContainerPossible) {
        if (possibleContainers.length === 0) {
            return React.createElement(react_bootstrap_1.FormGroup, null, "Suitable for import container not found");
        }
        if (this.props.container && isPropsContainerPossible) {
            return React.createElement(react_bootstrap_1.FormGroup, null,
                "Import will be made into ",
                React.createElement(components_2.ResourceLinkComponent, { uri: this.props.container }));
        }
        if (this.props.container && !isPropsContainerPossible) {
            return React.createElement("div", null,
                React.createElement(react_bootstrap_1.FormGroup, null, "Suitable for import container not found"));
        }
        if (possibleContainers.length === 1) {
            return React.createElement(react_bootstrap_1.FormGroup, null,
                "Import will be made into ",
                React.createElement(components_2.ResourceLinkComponent, { uri: possibleContainers[0]['@id'] }));
        }
        if (possibleContainers.length > 1) {
            return this.renderContainerList(selectedContainer, possibleContainers);
        }
        return null;
    };
    ImportResourceComponent.prototype.renderUnknownObjectsMessage = function (unknownObjects) {
        if (unknownObjects.length > 0) {
            return React.createElement(react_bootstrap_1.FormGroup, null,
                "These object IRIs are not present in target DB:",
                unknownObjects.map(function (objectIRI) {
                    return React.createElement("div", null,
                        React.createElement(react_bootstrap_1.ControlLabel, null, objectIRI['@id'] + '\n'));
                }));
        }
        return null;
    };
    ImportResourceComponent.prototype.renderModal = function () {
        var _this = this;
        var _a = this.state, wait = _a.wait, serverDone = _a.serverDone, serverDialog = _a.serverDialog, serverError = _a.serverError, selectedContainer = _a.selectedContainer;
        if (serverDone) {
            return React.createElement(react_bootstrap_1.Modal, { show: true, onHide: function () {
                    _this.setState({ serverDone: undefined }, function () { return _this.performPostAction(serverDone); });
                } },
                React.createElement(react_bootstrap_1.ModalHeader, null,
                    React.createElement(react_bootstrap_1.ModalTitle, null, "Success")),
                React.createElement(react_bootstrap_1.ModalBody, null,
                    "Import successfully done, resource ",
                    React.createElement(components_2.ResourceLinkComponent, { uri: serverDone }),
                    " created"));
        }
        else if (serverError) {
            return React.createElement(react_bootstrap_1.Modal, { show: true, onHide: function () {
                    _this.setState({ serverError: undefined });
                } },
                React.createElement(react_bootstrap_1.ModalHeader, null,
                    React.createElement(react_bootstrap_1.ModalTitle, null, "Error")),
                React.createElement(react_bootstrap_1.ModalBody, null, "Unexpected error during import"));
        }
        else if (serverDialog) {
            var _b = JSON.parse(serverDialog), delayedImportRequestId_1 = _b.delayedImportRequestId, possibleContainers = _b.possibleContainers, unknownObjects = _b.unknownObjects;
            var isPropsContainerPossible = possibleContainers.find(function (containerIRI) { return containerIRI['@id'] === _this.props.container; });
            var canProceed = possibleContainers.length > 0 && (this.state.selectedContainer ||
                this.props.container && isPropsContainerPossible ||
                !this.props.container && possibleContainers.length === 1);
            var proceedIntoContainer_1 = canProceed ?
                this.state.selectedContainer || this.props.container || possibleContainers[0]['@id'] :
                null;
            return React.createElement(react_bootstrap_1.Modal, { show: true, onHide: function () {
                    _this.setState({ serverDialog: undefined });
                } },
                React.createElement(react_bootstrap_1.ModalHeader, null,
                    React.createElement(react_bootstrap_1.ModalTitle, null, "Clarification needed")),
                React.createElement(react_bootstrap_1.ModalBody, null,
                    this.renderContainerMessage(selectedContainer, possibleContainers, isPropsContainerPossible),
                    this.renderUnknownObjectsMessage(unknownObjects)),
                React.createElement(react_bootstrap_1.ModalFooter, null,
                    React.createElement(react_bootstrap_1.Button, { disabled: !canProceed, onClick: function () {
                            _this.importFromDelayedId(delayedImportRequestId_1, proceedIntoContainer_1);
                            _this.setState({ serverDialog: undefined, selectedContainer: undefined });
                        } }, "Proceed"),
                    React.createElement(react_bootstrap_1.Button, { onClick: function () { return _this.setState({ serverDialog: undefined, selectedContainer: undefined, wait: false }); } }, "Cancel")));
        }
        else if (wait) {
            return React.createElement(react_bootstrap_1.Modal, { show: true, onHide: function () { } },
                React.createElement(react_bootstrap_1.ModalBody, null,
                    React.createElement(Spinner_1.Spinner, null)));
        }
        return null;
    };
    ImportResourceComponent.prototype.render = function () {
        var _this = this;
        var child = react_1.Children.only(this.props.children);
        var popover = React.createElement(react_bootstrap_1.Popover, { id: 'import-resource' },
            React.createElement(react_bootstrap_1.FormControl, { type: 'file', className: 'input-sm', onChange: function (e) {
                    var files = e.target.files;
                    if (files.length === 1) {
                        var file = files[0];
                        var fileReader = new FileReader();
                        fileReader.onload = function (e) {
                            var text = e.target.result;
                            _this.setState({ show: false });
                            _this.importFromText(text);
                        };
                        fileReader.readAsText(file);
                    }
                } }));
        return React.createElement(react_bootstrap_1.OverlayTrigger, { ref: 'trigger', trigger: [], placement: 'bottom', rootClose: true, overlay: popover, onExit: function () {
                _this.setState({ show: false });
            } }, react_1.cloneElement.apply(void 0, [child,
            assign({}, child.props, {
                onClick: function () { return _this.setState({ show: !_this.state.show }); },
            })].concat(child.props.children, [this.renderModal()])));
    };
    return ImportResourceComponent;
}(components_1.Component));
exports.ImportResourceComponent = ImportResourceComponent;
exports.default = ImportResourceComponent;
