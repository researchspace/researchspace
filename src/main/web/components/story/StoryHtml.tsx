/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import DOMPurifyModule = require('dompurify');

// the CommonJS build exports the instance itself, the ES build as default export
const DOMPurify: typeof DOMPurifyModule = (DOMPurifyModule as any).default || DOMPurifyModule;

const ALLOWED_TAGS = [
  'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'a', 'blockquote', 'img', 'figure', 'figcaption', 'span',
];
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt', 'data-story-goto'];

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;
  // external links open in a new tab without access to the opener
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.tagName === 'A' && node.getAttribute('href') && !node.hasAttribute('data-story-goto')) {
      const href = node.getAttribute('href');
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

/**
 * Removes scripts, event handlers, `javascript:` URLs and any markup outside a small set of
 * text elements from the HTML text of a slide.
 */
export function sanitizeStoryHtml(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html || '', { ALLOWED_TAGS, ALLOWED_ATTR });
}

export interface StoryHtmlProps {
  html: string;
  className?: string;
  /** Called when a link with `data-story-goto="n"` (slide number from 1) is clicked. */
  onGoTo?: (index: number) => void;
}

/**
 * Renders the sanitized HTML text of a slide.
 */
export class StoryHtml extends React.Component<StoryHtmlProps> {
  private onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest('[data-story-goto]');
    if (target && this.props.onGoTo) {
      event.preventDefault();
      const index = parseInt(target.getAttribute('data-story-goto'), 10);
      if (!isNaN(index)) {
        this.props.onGoTo(index - 1);
      }
    }
  };

  render() {
    return (
      <div
        className={this.props.className}
        onClick={this.onClick}
        dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(this.props.html) }}
      />
    );
  }
}
