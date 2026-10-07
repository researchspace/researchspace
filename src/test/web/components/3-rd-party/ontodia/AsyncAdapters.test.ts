/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as Kefir from 'kefir';

import { observableToCancellablePromise } from
  'platform/components/3-rd-party/ontodia/AsyncAdapters';

describe('observableToCancellablePromise', () => {
  it('rejects when aborted after subscribing', async () => {
    const controller = new AbortController();
    const promise = observableToCancellablePromise(Kefir.pool(), controller.signal);
    controller.abort();

    try {
      await promise;
      expect.fail('Expected an abort rejection');
    } catch (error) {
      expect((error as Error).name).to.equal('AbortError');
    }
  });
});
