Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Maybe = require("data.maybe");
var react_dom_1 = require("react-dom");
var FrameComponent = require("react-frame-component");
var update = require("react-addons-update");
var Kefir = require("kefir");
var block = require("bem-cn");
var rdf_1 = require("platform/api/rdf");
var page_1 = require("platform/api/services/page");
var module_loader_1 = require("platform/api/module-loader");
var components_1 = require("platform/api/components");
var PrintSectionComponent_1 = require("./PrintSectionComponent");
require("./print-component.scss");
var Frame = react_1.createFactory(FrameComponent);
var IFRAME_REF = 'mp-iframe';
var DEFAULT_CLASS = 'mp-print';
var PrintComponent = (function (_super) {
    tslib_1.__extends(PrintComponent, _super);
    function PrintComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.setPrintSections = function () {
            var printSections = [];
            Kefir.sequentially(0, _this.props.pages)
                .map(function (page) { return rdf_1.Rdf.iri(page); })
                .flatMap(_this.loadAndParseTemplate)
                .onValue(function (content) {
                printSections.push(_this.findPrintSections(content));
            })
                .onEnd(function () {
                var concatPrintSections = [].concat.apply([], printSections);
                var mergedPrintSections = _this.mergePrintSections(concatPrintSections);
                var sections = mergedPrintSections.map(function (section) {
                    return {
                        content: section,
                        isSelected: true,
                    };
                });
                _this.setState({
                    sections: sections,
                }, _this.setStyles);
            });
        };
        _this.mergePrintSections = function (sections) {
            var map = {};
            for (var i = 0; i < sections.length; i++) {
                var section = sections[i];
                var id = section.props.id;
                map[id] ? map[id].push(section) : map[id] = [section];
            }
            return Object.keys(map).map(function (key) {
                var first = map[key][0];
                return map[key].length === 1
                    ? first
                    : react_1.DOM.div({ id: first.props.id, label: first.props.label }, map[key]);
            });
        };
        _this.loadAndParseTemplate = function (iri) {
            var repository = Maybe.fromNullable(_this.context.semanticContext)
                .map(function (context) { return context.repository; })
                .getOrElse(undefined);
            return page_1.PageService.loadRenderedTemplate(iri, iri, { repository: repository }).flatMap(function (page) {
                return Kefir.fromPromise(module_loader_1.ModuleRegistry.parseHtmlToReact("\n              <div>\n                " + page.templateHtml + "\n              </div>\n            ")).map(function (content) { return react_1.DOM.div({}, content); });
            }).toProperty();
        };
        _this.findPrintSections = function (content, printSections) {
            if (!printSections) {
                printSections = [];
            }
            if (!content) {
                return null;
            }
            if (content.type === PrintSectionComponent_1.PrintSectionComponent) {
                printSections.push(content);
            }
            else if (typeof content !== 'string') {
                react_1.Children.forEach(content.props.children, function (child) {
                    var elem = child;
                    _this.findPrintSections(elem, printSections);
                });
            }
            return printSections;
        };
        _this.setStyles = function () {
            module_loader_1.ModuleRegistry.parseHtmlToReact(document.head.innerHTML).then(function (head) {
                head = Array.isArray(head) ? head : [head];
                var styles = head.filter(function (item) {
                    return item.type === 'link' || item.type === 'style';
                });
                _this.setState({
                    styles: styles,
                });
            });
        };
        _this.handleCheck = function (index, e) {
            var sections = _this.state.sections;
            var updatedSection = update(sections[index], { isSelected: { $set: e.target.checked } });
            var newSections = update(sections, {
                $splice: [[index, 1, updatedSection]],
            });
            _this.setState({ sections: newSections });
        };
        _this.handlePrint = function () {
            var iframe = react_dom_1.findDOMNode(_this.refs[IFRAME_REF]);
            var print = iframe.contentWindow.document.execCommand('print', false, null);
            if (!print) {
                iframe.contentWindow.print();
            }
        };
        _this.state = {
            sections: [],
            styles: [],
        };
        return _this;
    }
    PrintComponent.prototype.componentDidMount = function () {
        this.setPrintSections();
    };
    PrintComponent.prototype.render = function () {
        var _this = this;
        var aside;
        var preview;
        var sections = this.state.sections;
        var selectedSections = sections
            .filter(function (section) {
            return section.isSelected;
        })
            .map(function (section) {
            return react_1.DOM.div({ key: section.content.props.id }, section.content);
        });
        var b = block(this.props.className || DEFAULT_CLASS);
        var iframe = Frame({
            ref: IFRAME_REF,
            head: react_1.DOM.div({}, this.state.styles, react_1.DOM.style({}, '.hidden-print {display: none} .frame-content {padding: 20px}')),
            className: b('iframe').toString(),
        }, selectedSections);
        if (sections.length > 1) {
            var checkboxlist = sections.map(function (section, index) {
                var _a = section.content.props, id = _a.id, label = _a.label;
                return react_1.DOM.div({ className: 'checkbox', key: id }, react_1.DOM.label({}, react_1.DOM.input({
                    type: 'checkbox',
                    value: label,
                    checked: section.isSelected,
                    onChange: _this.handleCheck.bind(_this, index),
                }), label));
            });
            aside = react_1.DOM.div({ className: 'panel panel-default ' + b('select').toString() }, react_1.DOM.div({ className: 'panel-heading ' + b('select-header').toString() }, 'Print Sections'), react_1.DOM.div({ className: 'panel-body ' + b('select-body').toString() }, checkboxlist), react_1.DOM.div({ className: 'panel-footer ' + b('select-footer').toString() }, react_1.DOM.button({ className: 'btn btn-primary', onClick: this.handlePrint }, 'Print')));
            preview = iframe;
        }
        else {
            preview = react_1.DOM.div({ className: b('body-inner').toString() }, react_1.DOM.div({ className: b('body-content').toString() }, iframe), react_1.DOM.div({ className: 'panel-footer ' + b('body-footer').toString() }, react_1.DOM.button({ className: 'btn btn-primary', onClick: this.handlePrint }, 'Print')));
        }
        return react_1.DOM.div({ className: b('').toString(), style: this.props.style }, react_1.DOM.div({ className: b('body').toString() }, react_1.DOM.div({ className: 'panel panel-default ' + b('preview').toString() }, preview), aside));
    };
    return PrintComponent;
}(components_1.Component));
exports.PrintComponent = PrintComponent;
exports.component = PrintComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
