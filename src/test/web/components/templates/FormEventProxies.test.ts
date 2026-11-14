/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';

/**
 * A form with an id reports when it has loaded (Form.Loaded, Form.LoadFailed). An event proxy
 * without event types reacts to every event of its source, so a proxy on a form has to name
 * the events it is for; otherwise it fires as soon as the form is shown.
 */
const TEMPLATES: { [name: string]: any } = {
  ImageAnnotationWorkspace: require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FImageAnnotationWorkspace.html'),
  ImageAnnotationForm: require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FImageAnnotationForm.html'),
};

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`).exec(tag);
  return match ? match[2] : undefined;
}

describe('event proxies on forms', () => {
  for (const name of Object.keys(TEMPLATES)) {
    it(`name their event types in ${name}`, () => {
      const source: string = TEMPLATES[name].default || TEMPLATES[name];
      const formIds = (source.match(/<semantic-form\s[\s\S]*?>/g) || []).map((tag) => attribute(tag, 'id'));
      expect(formIds).to.include('feature-creation-form');
      const proxies = (source.match(/<mp-event-proxy\s[\s\S]*?>/g) || []).filter(
        (tag) => formIds.indexOf(attribute(tag, 'on-event-source')) >= 0
      );
      expect(proxies.length).to.be.greaterThan(0);
      for (const proxy of proxies) {
        const types = attribute(proxy, 'on-event-types') || attribute(proxy, 'on-event-type');
        expect(types, attribute(proxy, 'id')).to.be.a('string').and.not.to.be.empty;
      }
    });
  }
});
