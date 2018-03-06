Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var chai_1 = require("chai");
var enzyme_1 = require("enzyme");
var forms_1 = require("platform/components/forms");
var FieldDefinition_1 = require("../fixturies/FieldDefinition");
var PROPS = {
    for: 'test',
    definition: forms_1.normalizeFieldDefinition(FieldDefinition_1.FIELD_DEFINITION),
    model: undefined,
};
describe('Description', function () {
    var descriptionComponent = enzyme_1.shallow(react_1.createElement(forms_1.Description, PROPS));
    describe('render', function () {
        it('as span', function () {
            chai_1.expect(descriptionComponent.find('span')).to.have.length(1);
        });
        it('with proper classname', function () {
            chai_1.expect(descriptionComponent.find('.field-description')).to.have.length(1);
        });
        it('with correct inner text', function () {
            chai_1.expect(descriptionComponent.text()).to.be.equal(FieldDefinition_1.FIELD_DEFINITION.description);
        });
    });
});
