/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect } from 'chai';
import { TemplateScope } from 'platform/api/services/template';

const CONFIG = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Knowledge_map';
const RESOURCE = 'https://example.org/heritage-sample/v0.9/format-change-1a';

async function render(source: string, options: object): Promise<string> {
  const scope = TemplateScope.create({});
  const template = await scope.compile(source);
  return template(options);
}

describe('instanceId template helper', () => {
  const source = '{{#bind id=(instanceId dashboardId config parentNode)}}{{id}}{{/bind}}';

  it('is stable across renders of the same inputs', async () => {
    const first = await render(source, { dashboardId: 'frame-1', config: CONFIG, parentNode: RESOURCE });
    const second = await render(source, { dashboardId: 'frame-1', config: CONFIG, parentNode: RESOURCE });
    expect(first).to.match(/^[0-9a-z]+$/);
    expect(second).to.equal(first);
  });

  it('differs for different inclusions', async () => {
    const byConfig = await render(source, { dashboardId: 'frame-1', config: CONFIG + '2', parentNode: RESOURCE });
    const byParent = await render(source, { dashboardId: 'frame-1', config: CONFIG, parentNode: RESOURCE + '/b' });
    const byFrame = await render(source, { dashboardId: 'frame-2', config: CONFIG, parentNode: RESOURCE });
    const base = await render(source, { dashboardId: 'frame-1', config: CONFIG, parentNode: RESOURCE });
    expect(new Set([base, byConfig, byParent, byFrame]).size).to.equal(4);
  });

  it('treats missing arguments as empty positions', async () => {
    const withParent = await render(source, { dashboardId: 'frame-1', config: CONFIG, parentNode: RESOURCE });
    const withoutParent = await render(source, { dashboardId: 'frame-1', config: CONFIG });
    const twice = await render(source, { dashboardId: 'frame-1', config: CONFIG });
    expect(withoutParent).to.not.equal(withParent);
    expect(twice).to.equal(withoutParent);
  });
});
