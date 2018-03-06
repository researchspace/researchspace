Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var Kefir = require("kefir");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var ldp_1 = require("platform/api/services/ldp");
var SetManagementEvents_1 = require("platform/api/services/ldp-set/SetManagementEvents");
var ldp_set_1 = require("platform/api/services/ldp-set");
var ComponentPersistence_1 = require("platform/api/persistence/ComponentPersistence");
var Spinner_1 = require("platform/components/ui/spinner/Spinner");
var ResourceLinkComponent_1 = require("platform/api/navigation/components/ResourceLinkComponent");
var Button = react_1.createFactory(ReactBootstrap.Button);
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.ModalHeader);
var ModalFooter = react_1.createFactory(ReactBootstrap.ModalFooter);
var ModalBody = react_1.createFactory(ReactBootstrap.ModalBody);
var FormControl = react_1.createFactory(ReactBootstrap.FormControl);
var ResourceLink = react_1.createFactory(ResourceLinkComponent_1.ResourceLinkComponent);
var ActionSaveComponent = (function (_super) {
    tslib_1.__extends(ActionSaveComponent, _super);
    function ActionSaveComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = { show: '' };
        _this.onClick = _this.onClick.bind(_this);
        _this.onSave = _this.onSave.bind(_this);
        _this.onCancel = _this.onCancel.bind(_this);
        return _this;
    }
    ActionSaveComponent.prototype.onClick = function () {
        this.setState({ show: 'editor' });
    };
    ActionSaveComponent.prototype.onSave = function () {
        var _this = this;
        this.setState({ show: 'saving' });
        var graph = ComponentPersistence_1.componentToGraph(this.props.component, this.state.label, this.state.description);
        ldp_1.ldpc(vocabularies_1.VocabPlatform.PersistedComponentContainer.value).addResource(graph)
            .flatMap(function (res) { return _this.props.addToDefaultSet ?
            ldp_set_1.addToDefaultSet(res, _this.props.id) : Kefir.constant(res); })
            .onValue(function (resourceIri) {
            _this.context.GLOBAL_EVENTS.trigger({ eventType: SetManagementEvents_1.SetManagementEvents.ItemAdded, source: _this.props.id });
            _this.setState({ show: 'success', savedIri: resourceIri.value });
        });
    };
    ActionSaveComponent.prototype.onCancel = function () {
        this.setState({
            show: '',
            savedIri: undefined,
            label: undefined,
            description: undefined,
        });
    };
    ActionSaveComponent.prototype.renderModal = function () {
        var _this = this;
        switch (this.state.show) {
            case 'editor':
                return Modal({ show: true, onHide: this.onCancel }, ModalHeader({}, 'Save visualization'), ModalBody({}, 'Label:', FormControl({
                    value: this.state.label ? this.state.label : '',
                    onChange: function (e) {
                        var newValue = e.target.value;
                        _this.setState({ label: newValue });
                    },
                }), 'Description:', FormControl({
                    type: 'textarea',
                    value: this.state.description ? this.state.description : '',
                    onChange: function (e) {
                        var newValue = e.target.value;
                        _this.setState({ description: newValue });
                    },
                })), ModalFooter({}, Button({ disabled: !this.state.label, onClick: this.onSave }, 'OK'), Button({ onClick: this.onCancel }, 'Cancel')));
            case 'saving':
                return Modal({ show: true, onHide: this.onCancel }, ModalHeader({}, 'Saving in progress'), ModalBody({}, Spinner_1.Spinner()));
            case 'success':
                return Modal({ show: true, onHide: this.onCancel }, ModalHeader({}, 'Success'), ModalBody({}, 'Visualization ', ResourceLink({ uri: this.state.savedIri }), 'has been saved successfully!'), ModalFooter({}, Button({ onClick: this.onCancel }, 'OK')));
            case '':
                return null;
        }
    };
    ActionSaveComponent.prototype.render = function () {
        if (react_1.Children.count(this.props.children) === 1) {
            var child = react_1.Children.only(this.props.children);
            return react_1.cloneElement.apply(void 0, [child, tslib_1.__assign({}, child.props, { onClick: this.onClick })].concat(child.props.children, [this.renderModal()]));
        }
        return Button({
            title: 'Save into default set',
            onClick: this.onClick,
        }, react_1.DOM.i({ className: 'fa fa-save' }), this.renderModal());
    };
    return ActionSaveComponent;
}(components_1.Component));
ActionSaveComponent.contextTypes = tslib_1.__assign({}, components_1.ContextTypes, events_1.GlobalEventsContextTypes);
ActionSaveComponent.defaultProps = {
    addToDefaultSet: false,
};
exports.ActionSaveComponent = ActionSaveComponent;
exports.default = ActionSaveComponent;
