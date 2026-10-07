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
const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'data-story-goto',
];
/** Classes of the editor for alignment and list indentation; other classes are removed. */
const ALLOWED_CLASS = /^ql-(align-(center|right|justify)|indent-[1-8])$/;
/** Link to a slide of the story: `#3` is slide 3. */
const SLIDE_LINK = /^#(\d+)$/;

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) {
    return;
  }
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
    if (node.hasAttribute && node.hasAttribute('class')) {
      const classes = node.getAttribute('class').split(/\s+/).filter((c) => ALLOWED_CLASS.test(c));
      if (classes.length > 0) {
        node.setAttribute('class', classes.join(' '));
      } else {
        node.removeAttribute('class');
      }
    }
    // external links open in a new tab without access to the opener
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
  /** Called when a link to a slide (`#n`, or `data-story-goto="n"`; n from 1) is clicked. */
  onGoTo?: (index: number) => void;
}

/**
 * Renders the sanitized HTML text of a slide.
 */
export class StoryHtml extends React.Component<StoryHtmlProps> {
  private onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest('a');
    if (!link || !this.props.onGoTo) {
      return;
    }
    const slide = link.getAttribute('data-story-goto') || (SLIDE_LINK.exec(link.getAttribute('href') || '') || [])[1];
    const index = parseInt(slide, 10);
    if (!isNaN(index)) {
      event.preventDefault();
      this.props.onGoTo(index - 1);
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
