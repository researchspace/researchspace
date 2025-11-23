import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from 'chai';

import { Description, StaticFieldProps, normalizeFieldDefinition } from 'platform/components/forms';
import { mockConfig } from 'platform-tests/mocks';
import { FIELD_DEFINITION } from '../fixturies/FieldDefinition';

mockConfig();

const PROPS: StaticFieldProps = {
  for: 'test',
  definition: normalizeFieldDefinition(FIELD_DEFINITION),
  model: undefined,
};

describe('Description', () => {
  it('renders the description text', () => {
    render(createElement(Description, PROPS));
    const descriptionElement = screen.getByText(FIELD_DEFINITION.description);
    expect(descriptionElement).to.exist;
    expect(descriptionElement.tagName).to.equal('SPAN');
    expect(descriptionElement.className).to.contain('field-description');
  });
});
