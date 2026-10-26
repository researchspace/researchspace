/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import { expect } from 'chai';
import { SemanticForm, FieldValue, CompositeValue, PlainTextInput, CompositeInput } from 'platform/components/forms';
import { Rdf } from 'platform/api/rdf';
import { mockConfig } from 'platform-tests/mocks';

const h = React.createElement;
mockConfig();

const xsdString = 'http://www.w3.org/2001/XMLSchema#string';
const fields = [
  { id: 'name', label: 'Name', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsdString },
  { id: 'address', label: 'Address', minOccurs: 0, maxOccurs: 3, xsdDatatype: 'http://www.w3.org/2001/XMLSchema#anyURI' },
];
const addressFields = [
  { id: 'street', label: 'Street', minOccurs: 0, maxOccurs: 1, xsdDatatype: xsdString },
];

class FormFixture extends React.Component<{ openByDefault?: boolean }, { model: any }> {
  state = { model: FieldValue.fromLabeled({ value: Rdf.iri('') }) as any };
  private change = (model: CompositeValue) => this.setState({ model });
  render() {
    return h(SemanticForm, { fields, model: this.state.model, onChanged: this.change, onLoaded: this.change },
      h(PlainTextInput, { for: 'name', placeholder: 'Enter name' }),
      h(CompositeInput, { for: 'address', fields: addressFields, openByDefault: this.props.openByDefault },
        h(PlainTextInput, { for: 'street', placeholder: 'Enter street' })));
  }
}

describe('semantic-form-composite-input open-by-default', () => {
  let host: HTMLDivElement;
  const find = (s: string) => host.querySelector<HTMLElement>(s);
  const findAll = (s: string) => host.querySelectorAll<HTMLElement>(s);
  async function ready() {
    for (let i = 0; i < 100 && !find('input[placeholder="Enter name"]'); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(Boolean(find('input[placeholder="Enter name"]')), host.textContent).to.equal(true);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); });

  it('keeps an optional composite closed by default', async () => {
    render(h(FormFixture, {}), host);
    await ready();
    expect(findAll('input[placeholder="Enter street"]').length).to.equal(0);
    expect(find('.cardinality-support__add-value--first')).to.not.equal(null);
  });

  it('shows one empty instance with open-by-default and lets it be removed', async () => {
    render(h(FormFixture, { openByDefault: true }), host);
    await ready();
    expect(findAll('input[placeholder="Enter street"]').length).to.equal(1);
    // a second instance is still added through the button, not opened automatically
    expect(find('.cardinality-support__add-value--another')).to.not.equal(null);
    // min-occurs is still 0, so the opened instance can be removed
    const remove = find('.cardinality-support__remove-value');
    expect(remove).to.not.equal(null);
    Simulate.click(remove);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(findAll('input[placeholder="Enter street"]').length).to.equal(0);
  });
});
