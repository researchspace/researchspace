Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sparql_1 = require("platform/api/sparql");
var template_1 = require("platform/api/services/template");
var MOCKED_REMOTE_TEMPLATES = {
    'test:elephant': 'elephant and {{> test:lion}}',
    'test:mouse': 'mouse and {{> test:lion}}',
    'test:lion': 'lion!',
    'test:node': '{{name}}({{#each items}}{{> test:node}};{{/each}})',
};
describe('TemplateService', function () {
    sparql_1.SparqlUtil.init({ test: 'test:' });
    mockFetchRemoteTemplate();
    it('resolves registered partials and helpers', function () {
        var scope = template_1.TemplateScope.default.clone();
        scope.registerPartial('foo', '<div>{{#> bar this}}{{apple}}{{/bar}}</div>');
        scope.registerPartial('bar', '<p>{{#bold}}~{{> @partial-block}}~{{/bold}}</p>');
        scope.registerHelper('bold', function (options) { return "<b>" + options.fn(this) + "</b>"; });
        return scope.compile('{{> foo this}}').then(function (template) {
            var rendered = template({ apple: 'berry' });
            chai_1.expect(rendered).to.be.equal('<div><p><b>~berry~</b></p></div>');
        });
    });
    it('resolves remote templates', function () {
        var scope = template_1.TemplateScope.default.clone();
        scope.registerPartial('eagle', 'eagle and {{> test:elephant}}');
        return scope.compile('Remote: {{> eagle}}').then(function (template) {
            var rendered = template({});
            chai_1.expect(rendered).to.be.equal('Remote: eagle and elephant and lion!');
        });
    });
    it('resolves remote diamond-dependent templates', function () {
        var scope = template_1.TemplateScope.default.clone();
        var source = 'Diamond: {{> test:elephant}}, {{> test:mouse}}';
        return scope.compile(source).then(function (template) {
            var rendered = template({});
            chai_1.expect(rendered).to.be.equal('Diamond: elephant and lion!, mouse and lion!');
        });
    });
    it('resolves remote recursive templates', function () {
        var scope = template_1.TemplateScope.default.clone();
        return scope.compile('{{> test:node}}').then(function (template) {
            var rendered = template({
                name: 'abc',
                items: [
                    { name: 'def' },
                    {
                        name: 'ghi',
                        items: [
                            { name: 'jkl' },
                            { name: 'mno' },
                        ],
                    },
                ],
            });
            chai_1.expect(rendered).to.be.equal('abc(def();ghi(jkl();mno(););)');
        });
    });
    it('allows to override remote template with a local ones', function () {
        var scope = template_1.TemplateScope.default.clone();
        scope.registerPartial('test:lion', 'simba!');
        return scope.compile('Override: {{> test:elephant}}').then(function (template) {
            var rendered = template({});
            chai_1.expect(rendered).to.be.equal('Override: elephant and simba!');
        });
    });
    it('error when remote template is not found', function () {
        var scope = template_1.TemplateScope.default.clone();
        return scope.compile('Error: {{> test:error}}').then(function () { return Promise.reject(new Error('Expected to throw an error')); }, function () { return Promise.resolve(); });
    });
    it('uses separate caches for different scopes', function () {
        var firstScope = template_1.TemplateScope.default.clone();
        var secondScope = template_1.TemplateScope.default.clone();
        firstScope.registerPartial('foo', 'FIRST');
        secondScope.registerPartial('foo', 'SECOND');
        return Promise.all([
            firstScope.compile('{{> foo}}'),
            secondScope.compile('{{> foo}}'),
        ]).then(function (_a) {
            var firstTemplate = _a[0], secondTemplate = _a[1];
            var firstRendered = firstTemplate({});
            var secondRendered = secondTemplate({});
            chai_1.expect(firstRendered).to.be.equal('FIRST');
            chai_1.expect(secondRendered).to.be.equal('SECOND');
        });
    });
    it('renders nothing when template is undefined or null', function () {
        var scope = template_1.TemplateScope.default.clone();
        return Promise.all([
            scope.compile(undefined),
            scope.compile(null),
        ]).then(function (_a) {
            var undefinedTemplate = _a[0], nullTemplate = _a[1];
            var context = { foo: 42 };
            var parentContext = { bar: 'hello' };
            chai_1.expect(undefinedTemplate()).to.be.equal('');
            chai_1.expect(undefinedTemplate(context, parentContext)).to.be.equal('');
            chai_1.expect(nullTemplate()).to.be.equal('');
            chai_1.expect(nullTemplate(context, parentContext)).to.be.equal('');
        });
    });
    describe('data context', function () {
        it('captures and restores data context', function () {
            var scope = template_1.TemplateScope.default.clone();
            scope.registerPartial('foo', 'x={{x}} y={{y}} z={{z}}');
            var template = '{{{{capture}}}}{{> foo x=2 y=20}}{{{{/capture}}}}';
            return scope.compile(template).then(function (firstTemplate) {
                var capturer = new template_1.ContextCapturer();
                var firstUnescaped = firstTemplate({ x: 1, y: 10, z: 100 }, { capturer: capturer });
                return scope.compile(firstUnescaped).then(function (secondTemplate) { return ({
                    secondTemplate: secondTemplate,
                    parentContext: capturer.getResult(),
                }); });
            }).then(function (_a) {
                var secondTemplate = _a.secondTemplate, parentContext = _a.parentContext;
                var secondUnescaped = secondTemplate({ y: 30 }, { parentContext: parentContext });
                chai_1.expect(secondUnescaped).to.be.equal('x=2 y=20 z=100');
            });
        });
        it('restores correct data context inside nested {{#each}} blocks', function () {
            var scope = template_1.TemplateScope.default.clone();
            scope.registerPartial('foo', '[x={{x}} y={{y}} xindex={{xindex}} yindex={{yindex}}]\n');
            var template = '{{#each xs}}{{#each ../ys}}{{{{capture}}}}' +
                '{{> foo x=(lookup @root.xs @../index) y=this xindex=@../index yindex=@index}}' +
                '{{{{/capture}}}}{{/each}}{{/each}}';
            return scope.compile(template)
                .then(function (firstTemplate) {
                var capturer = new template_1.ContextCapturer();
                var firstUnescaped = firstTemplate({ xs: [1, 2], ys: [10, 20] }, { capturer: capturer });
                return scope.compile(firstUnescaped).then(function (secondTemplate) { return ({
                    secondTemplate: secondTemplate,
                    parentContext: capturer.getResult(),
                }); });
            }).then(function (_a) {
                var secondTemplate = _a.secondTemplate, parentContext = _a.parentContext;
                var secondUnescaped = secondTemplate({}, { parentContext: parentContext });
                chai_1.expect(secondUnescaped).to.be.equal([
                    '[x=1 y=10 xindex=0 yindex=0]\n',
                    '[x=1 y=20 xindex=0 yindex=1]\n',
                    '[x=2 y=10 xindex=1 yindex=0]\n',
                    '[x=2 y=20 xindex=1 yindex=1]\n',
                ].join(''));
            });
        });
    });
});
function mockFetchRemoteTemplate() {
    beforeEach(function () {
        this.originalFetchRemoteTemplate = template_1.TemplateScope._fetchRemoteTemplate;
        template_1.TemplateScope._fetchRemoteTemplate = function (iri) {
            var template = MOCKED_REMOTE_TEMPLATES[iri.value];
            if (template === undefined) {
                return Promise.reject(new Error("Invalid mocked remote template iri " + iri));
            }
            return Promise.resolve(template_1.parseTemplate(template));
        };
    });
    afterEach(function () {
        template_1.TemplateScope._fetchRemoteTemplate = this.originalFetchRemoteTemplate;
    });
}
