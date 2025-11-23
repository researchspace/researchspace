import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from 'chai';

import { Label, StaticFieldProps, normalizeFieldDefinition } from 'platform/components/forms';
import { mockConfig } from 'platform-tests/mocks';
import { FIELD_DEFINITION } from '../fixturies/FieldDefinition';

mockConfig();

const PROPS: StaticFieldProps = {
  for: 'test',
  definition: normalizeFieldDefinition(FIELD_DEFINITION),
  model: undefined,
};

describe('Field Static Label Component', () => {
  it('renders the label text', () => {
    render(createElement(Label, PROPS));
    const labelElement = screen.getByText(FIELD_DEFINITION.label as string);
    expect(labelElement).to.exist;
    expect(labelElement.tagName).to.equal('SPAN');
    expect(labelElement.className).to.contain('field-label');
  });
});
