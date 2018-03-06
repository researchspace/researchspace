Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var classNames = require("classnames");
var TransitionGroup = require("react-addons-css-transition-group");
var maybe = require("data.maybe");
var _ = require("lodash");
var sparql_1 = require("platform/api/sparql");
var TemplateItem_1 = require("platform/components/ui/template/TemplateItem");
var spinner_1 = require("platform/components/ui/spinner");
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.Modal.Header);
var ModalTitle = react_1.createFactory(ReactBootstrap.Modal.Title);
var ModalBody = react_1.createFactory(ReactBootstrap.Modal.Body);
require("../scss/object-representations-widget.scss");
var ObjectRepresentationsWidget = (function (_super) {
    tslib_1.__extends(ObjectRepresentationsWidget, _super);
    function ObjectRepresentationsWidget(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.handleImageChanges = function (e) {
            var aspectRatio = e.target.offsetHeight / e.target.offsetWidth;
            if (_this.LARGEST_PREVIEW_REP_WIDTH * aspectRatio > _this.largestPreviewRepHeight) {
                _this.largestPreviewRepHeight = _this.LARGEST_PREVIEW_REP_WIDTH * aspectRatio;
            }
            _this.setImageLoaded(e);
            _this.setState({ imagesAreLoading: !_this.allImagesAreLoaded() });
        };
        _this.showModalNav = function () {
            if (_this.state.modalNavIsDisplayed === false && _this.allReps.length > 1) {
                _this.setState({ modalNavIsDisplayed: true });
            }
        };
        _this.hideModalNav = function () {
            _this.setState({ modalNavIsDisplayed: false });
        };
        _this.handleModalKeyEvents = function (e) {
            if (e.keyCode === 37) {
                _this.prevModalImage();
            }
            else if (e.keyCode === 39) {
                _this.nextModalImage();
            }
            else if (e.keyCode === 27) {
                _this.hideModalNav();
            }
        };
        _this.state = {
            modalIsDisplayed: false,
            modalNavIsDisplayed: false,
            isLoading: true,
            imagesAreLoading: true,
            mainPreviewRep: maybe.Nothing(),
            focusedPreviewRep: maybe.Nothing(),
            focusedModalRep: maybe.Nothing(),
        };
        _this.allReps = [];
        _this.entityLabel = '';
        _this.largestPreviewRepHeight = 0;
        _this.LARGEST_PREVIEW_REP_WIDTH = 300;
        _this.TRANSITION_TIME = 300;
        return _this;
    }
    ObjectRepresentationsWidget.prototype.componentDidMount = function () {
        this.executeQuery(this.props);
    };
    ObjectRepresentationsWidget.prototype.executeQuery = function (props) {
        var _this = this;
        var IS_MAIN_REP = 'isMainRep';
        var IMG_URL = 'imgURL';
        var LABEL = 'label';
        var mainPreviewRep = maybe.Nothing();
        var focusedPreviewRep = maybe.Nothing();
        var otherPreviewReps = [];
        sparql_1.SparqlClient.select(props.query).onValue(function (res) {
            _.forEach(res.results.bindings, function (binding) {
                if (mainPreviewRep.isNothing && binding[IS_MAIN_REP].value === 'true') {
                    mainPreviewRep = maybe.Just({ imgURL: binding[IMG_URL].value, loaded: false });
                    focusedPreviewRep = maybe.Just({ imgURL: binding[IMG_URL].value, loaded: false });
                }
                else {
                    if (binding[IMG_URL]) {
                        otherPreviewReps.push({ imgURL: binding[IMG_URL].value, loaded: false });
                    }
                }
                if (binding[LABEL]) {
                    _this.entityLabel = binding[LABEL].value;
                }
            });
            if (mainPreviewRep.isNothing && otherPreviewReps.length) {
                mainPreviewRep = maybe.Just(otherPreviewReps.shift());
                focusedPreviewRep = mainPreviewRep;
            }
            if (mainPreviewRep.isNothing && otherPreviewReps.length === 0) {
                _this.setState({ imagesAreLoading: false });
            }
            else {
                if (mainPreviewRep.isJust) {
                    _this.addToAllReps(mainPreviewRep.get().imgURL);
                }
                if (otherPreviewReps.length) {
                    _.forEach(otherPreviewReps, function (otherRep) {
                        _this.addToAllReps(otherRep.imgURL);
                    });
                }
            }
            _this.setState({
                data: res,
                modalIsDisplayed: false,
                isLoading: false,
                mainPreviewRep: mainPreviewRep,
                otherPreviewReps: otherPreviewReps,
                focusedPreviewRep: focusedPreviewRep,
                focusedModalRep: focusedPreviewRep,
            });
        });
    };
    ObjectRepresentationsWidget.prototype.render = function () {
        return react_1.DOM.div.apply(react_1.DOM, [{ className: 'object-representations modal-container' }].concat((this.state.isLoading ? [react_1.createElement(spinner_1.Spinner)] : this.getContents())));
    };
    ObjectRepresentationsWidget.prototype.getContents = function () {
        if (this.state.mainPreviewRep.isJust) {
            return [
                this.createFocusedImageRepresentation(),
                this.createThumbnails(),
                this.createModal(),
                this.state.imagesAreLoading ? react_1.createElement(spinner_1.Spinner) : null,
            ];
        }
        else {
            return [];
        }
    };
    ObjectRepresentationsWidget.prototype.createFocusedImageRepresentation = function () {
        var focused = this.state.focusedPreviewRep.get().imgURL;
        var style = {
            height: this.largestPreviewRepHeight + 'px',
        };
        return react_1.DOM.div({
            title: 'Click to view full-size image',
            className: 'object-representations__image--focused',
            style: style,
            onClick: this.showModal.bind(this),
            onLoad: this.handleImageChanges,
        }, react_1.createElement(TransitionGroup, {
            key: 'image-focused-transition-group',
            transitionName: 'cross-fade',
            transitionEnterTimeout: this.TRANSITION_TIME,
            transitionLeaveTimeout: this.TRANSITION_TIME,
        }, react_1.DOM.img({
            className: 'image--focused',
            src: focused,
            key: focused,
        })));
    };
    ObjectRepresentationsWidget.prototype.createThumbnails = function () {
        var _this = this;
        return react_1.createElement(TransitionGroup, {
            key: 'image-thumbs-transition-group',
            transitionName: 'fade-in',
            transitionAppear: true,
            transitionAppearTimeout: this.TRANSITION_TIME,
            transitionEnterTimeout: this.TRANSITION_TIME,
            transitionLeaveTimeout: this.TRANSITION_TIME,
        }, react_1.DOM.div({
            key: 'object-representations__images',
            className: 'object-representations__images',
        }, this.state.otherPreviewReps.length ?
            react_1.createElement(TemplateItem_1.default, {
                key: 'main-rep-thumb',
                template: {
                    source: this.props.template,
                    options: { imgURL: { value: this.state.mainPreviewRep.get().imgURL } },
                },
                componentProps: {
                    className: classNames({
                        'object-representations__image--active': (this.state.mainPreviewRep.get().imgURL === this.state.focusedPreviewRep.get().imgURL),
                        'object-representations__image': (this.state.mainPreviewRep.get().imgURL !== this.state.focusedPreviewRep.get().imgURL),
                    }),
                    onClick: function () { return _this.updateFocusedImage(_this.state.mainPreviewRep.get().imgURL); },
                    onLoad: this.handleImageChanges,
                },
            }) : null, this.state.otherPreviewReps.map(function (res, i) {
            return react_1.createElement(TemplateItem_1.default, {
                key: 'other-rep-thumb-' + i,
                template: {
                    source: _this.props.template,
                    options: { imgURL: { value: res.imgURL } },
                },
                componentProps: {
                    className: classNames({
                        'object-representations__image--active': (_this.state.focusedPreviewRep.get().imgURL === res.imgURL),
                        'object-representations__image': (_this.state.focusedPreviewRep.get().imgURL !== res.imgURL),
                    }),
                    onClick: function () { return _this.updateFocusedImage(res.imgURL); },
                    onLoad: _this.handleImageChanges,
                },
            });
        })));
    };
    ObjectRepresentationsWidget.prototype.createModal = function () {
        var fullSizeImgURL = this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().imgURL : '';
        var modalStyle = {
            width: this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().width + 2 + 'px' : '0',
            overflow: 'hidden',
            margin: 'auto',
            paddingLeft: '0',
        };
        return Modal({
            style: modalStyle,
            dialogClassName: 'object-representations-modal',
            show: this.state.modalIsDisplayed,
            onHide: this.hideModal.bind(this),
            onMouseEnter: this.showModalNav,
            onMouseLeave: this.hideModalNav,
            onKeyUp: this.handleModalKeyEvents,
        }, ModalHeader({ closeButton: true }, ModalTitle({}, this.entityLabel)), ModalBody({}, react_1.createElement(TransitionGroup, {
            key: 'modal-nav-transition-group',
            className: 'object-representations-modal__body',
            style: {
                width: this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().width + "px" : '0px',
                height: this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().height + "px" : '0px',
            },
            transitionName: 'fade-in',
            transitionAppear: true,
            transitionLeave: true,
            transitionAppearTimeout: this.TRANSITION_TIME,
            transitionEnterTimeout: this.TRANSITION_TIME,
            transitionLeaveTimeout: this.TRANSITION_TIME,
        }, this.state.modalNavIsDisplayed ? [
            react_1.DOM.span({
                className: 'object-representations-modal__nav fa fa-chevron-circle-left',
                onClick: this.prevModalImage.bind(this)
            }),
            react_1.DOM.span({
                className: 'object-representations-modal__nav fa fa-chevron-circle-right',
                onClick: this.nextModalImage.bind(this)
            }),
        ] : []), react_1.DOM.img({
            src: fullSizeImgURL,
            style: {
                width: this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().width + "px" : '0px'
            }
        })));
    };
    ObjectRepresentationsWidget.prototype.updateFocusedImage = function (url) {
        var newFocusedRep = _.find(this.allReps, ['imgURL', url]);
        this.setState({
            focusedPreviewRep: maybe.Just(newFocusedRep),
            focusedModalRep: maybe.Just(newFocusedRep),
        });
    };
    ObjectRepresentationsWidget.prototype.setImageLoaded = function (e) {
        var _this = this;
        var maxHeight = window.innerHeight - 50;
        _.forEach(this.allReps, function (rep) {
            if (rep.imgURL === e.target.currentSrc) {
                rep.loaded = true;
                rep.width = e.target.naturalWidth <= _this.props.maxModalWidth ? e.target.naturalWidth : _this.props.maxModalWidth;
                rep.height = rep.width / (e.target.naturalWidth / e.target.naturalHeight);
                if (rep.height > maxHeight) {
                    rep.height = maxHeight;
                    rep.width = rep.height / (e.target.naturalHeight / e.target.naturalWidth);
                }
                if (rep.imgURL === _this.state.focusedPreviewRep.get().imgURL) {
                    var newFocusedRep = _this.state.focusedPreviewRep.get();
                    newFocusedRep.width = rep.width;
                    newFocusedRep.height = rep.height;
                    _this.setState({ focusedPreviewRep: maybe.Just(newFocusedRep) });
                }
                return false;
            }
        });
    };
    ObjectRepresentationsWidget.prototype.addToAllReps = function (url) {
        if (!_.some(this.allReps, ['imgURL', url])) {
            this.allReps.push({
                imgURL: url,
                loaded: false,
            });
        }
    };
    ObjectRepresentationsWidget.prototype.allImagesAreLoaded = function () {
        return _.every(this.allReps, ['loaded', true]);
    };
    ObjectRepresentationsWidget.prototype.hideModal = function () {
        this.setState({
            modalIsDisplayed: false,
            focusedModalRep: this.state.focusedPreviewRep,
        });
    };
    ObjectRepresentationsWidget.prototype.showModal = function () {
        this.setState({ modalIsDisplayed: true });
    };
    ObjectRepresentationsWidget.prototype.nextModalImage = function () {
        if (this.allReps.length > 1) {
            var index = _.findIndex(this.allReps, { 'imgURL': this.state.focusedModalRep.get().imgURL });
            if (index !== -1) {
                var nextIndex = (index === this.allReps.length - 1) ? 0 : index + 1;
                this.setState({
                    focusedModalRep: maybe.Just(this.allReps[nextIndex]),
                });
            }
        }
    };
    ;
    ObjectRepresentationsWidget.prototype.prevModalImage = function () {
        if (this.allReps.length > 1) {
            var index = _.findIndex(this.allReps, { 'imgURL': this.state.focusedModalRep.get().imgURL });
            if (index !== -1) {
                var prevIndex = (index === 0) ? this.allReps.length - 1 : index - 1;
                this.setState({
                    focusedModalRep: maybe.Just(this.allReps[prevIndex]),
                });
            }
        }
    };
    ;
    return ObjectRepresentationsWidget;
}(react_1.Component));
ObjectRepresentationsWidget.defaultProps = {
    query: '',
    template: '<img class="object-representations__image--rep" src="{{imgURL.value}}"/>',
    context: {},
    maxModalWidth: 1200
};
exports.ObjectRepresentationsWidget = ObjectRepresentationsWidget;
exports.c = ObjectRepresentationsWidget;
exports.f = react_1.createFactory(exports.c);
exports.default = exports.c;
