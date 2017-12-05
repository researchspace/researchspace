/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { DOM as D, createFactory, ReactElement, Children, CSSProperties } from 'react';
import * as Maybe from 'data.maybe';
import { findDOMNode } from 'react-dom';
import * as FrameComponent from 'react-frame-component';
import * as update from 'react-addons-update';
import * as Kefir from 'kefir';
import * as block from 'bem-cn';

import { Rdf } from 'platform/api/rdf';
import { PageService } from 'platform/api/services/page';
import { ModuleRegistry } from 'platform/api/module-loader';
import { Component } from 'platform/api/components';
import { PrintSectionComponent } from './PrintSectionComponent';

import './print-component.scss';

const Frame = createFactory(FrameComponent);
const IFRAME_REF = 'mp-iframe';
const DEFAULT_CLASS = 'mp-print';

export interface Props {
  /**
   * Array of page IRIs
   */
  pages: string[];
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Custom styles
   */
  style?: CSSProperties;
}

export interface State {
  sections?: {
    content: ReactElement<any>;
    isSelected: boolean;
  }[];
  styles?: ReactElement<any>[];
}

/**
 * This component finds print sections in pages and renders them into a iframe.
 * Iframe content is exported to PDF by the browsers print functionality.
 *
 * Component can be used together with semantic-context, to specify the repository
 * that should be used for evaluation of `pages`.
 *
 * @example
 * <mp-print-section id="1" label="First Section">
 *     Section 1
 * </mp-print-section>
 * <mp-print-section id="1" label="Second Section">
 *     Section 2<br>
 *     This will be merged for printing with section one.
 * </mp-print-section>
 * <mp-print-section id="3" label="Third Section">
 *     Section 3
 * </mp-print-section>
 *
 * <mp-overlay-dialog title="Print Preview" type="lightbox">
 *     <mp-overlay-dialog-trigger>
 *         <button>Print Page</button>
 *     </mp-overlay-dialog-trigger>
 *     <mp-overlay-dialog-content>
 *         <mp-print pages='["[[this]]"]'></mp-print>
 *     </mp-overlay-dialog-content>
 * </mp-overlay-dialog>
 */
export class PrintComponent extends Component<Props, State> {
  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      sections: [],
      styles: [],
    };
  }

  componentDidMount() {
    this.setPrintSections();
  }

  private setPrintSections = () => {
    const printSections = [];

    Kefir.sequentially(0, this.props.pages)
      .map(page => Rdf.iri(page))
      .flatMap(this.loadAndParseTemplate)
      .onValue(content => {
        printSections.push(this.findPrintSections(content));
      })
      .onEnd(() => {
        const concatPrintSections = [].concat.apply([], printSections);
        const mergedPrintSections = this.mergePrintSections(concatPrintSections);
        const sections = mergedPrintSections.map(section => {
          return {
            content: section,
            isSelected: true,
          };
        });

        this.setState({
          sections: sections,
        }, this.setStyles);
      });
  }

  private mergePrintSections = (sections) => {
    const map = {};

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const id = section.props.id;

      map[id] ? map[id].push(section) : map[id] = [section];
    }

    return Object.keys(map).map(function(key) {
      const first = map[key][0];
      return map[key].length === 1
        ? first
        : D.div({id: first.props.id, label: first.props.label}, map[key]);
    });
  }

  private loadAndParseTemplate = (iri: Rdf.Iri): Kefir.Property<ReactElement<any>> => {
    const repository =
      Maybe.fromNullable(this.context.semanticContext)
      .map(context => context.repository)
      .getOrElse(undefined);

    return PageService.loadRenderedTemplate(
      iri, iri, {repository}
    ).flatMap<ReactElement<any>>(
      page =>
        Kefir.fromPromise(
          ModuleRegistry.parseHtmlToReact(
            `
              <div>
                ${page.templateHtml}
              </div>
            `
          )
        ).map<ReactElement<any>>(
          content => D.div({}, content)
        )
    ).toProperty();
  }

  private findPrintSections = (
    content: ReactElement<any>,
    printSections?: ReactElement<any>[]
  ): Array<ReactElement<any>> => {
    if (!printSections) {
      printSections = [];
    }

    if (!content) { return null; }

    if (content.type === PrintSectionComponent) {
      printSections.push(content);
    } else if (typeof content !== 'string') {
      Children.forEach(content.props.children, child => {
        const elem = child as ReactElement<any>;
        this.findPrintSections(elem, printSections);
      });
    }

    return printSections;
  }

  private setStyles = () => {
    ModuleRegistry.parseHtmlToReact(document.head.innerHTML).then(head => {
      head = Array.isArray(head) ? head : [head];
      const styles = head.filter(item => {
        return item.type === 'link' || item.type === 'style';
      });
      this.setState({
        styles: styles,
      });
    });
  }

  private handleCheck = (index, e) => {
    const sections = this.state.sections;
    const updatedSection = update(sections[index], {isSelected: {$set: e.target.checked}});
    const newSections = update(sections, {
      $splice: [[index, 1, updatedSection]],
    });
    this.setState({sections: newSections});
  }

  private handlePrint = () => {
    const iframe = findDOMNode<HTMLIFrameElement>(this.refs[IFRAME_REF]);

    // print iframe
    const print = iframe.contentWindow.document.execCommand('print', false, null); // for IE
    if (!print) {
      iframe.contentWindow.print();
    }
  }

  public render() {
    let aside: ReactElement<any>;
    let preview: ReactElement<any>;

    const sections = this.state.sections;

    const selectedSections = sections
      .filter(section => {
        return section.isSelected;
      })
      .map(section => {
        return D.div({key: section.content.props.id}, section.content);
      });

    const b = block(this.props.className || DEFAULT_CLASS);

    const iframe = Frame({
      ref: IFRAME_REF,
      head: D.div({},
        this.state.styles,
        D.style({}, '.hidden-print {display: none} .frame-content {padding: 20px}')
      ),
      className: b('iframe').toString(),
    }, selectedSections);

    if (sections.length > 1) {
      const checkboxlist = sections.map((section, index) => {
        const {id, label} = section.content.props;
        return D.div({className: 'checkbox', key: id}, D.label({}, D.input({
          type: 'checkbox',
          value: label,
          checked: section.isSelected,
          onChange: this.handleCheck.bind(this, index),
        }), label));
      });

      aside = D.div({className: 'panel panel-default ' + b('select').toString()},
        D.div({className: 'panel-heading ' + b('select-header').toString()},
          'Print Sections'
        ),
        D.div({className: 'panel-body ' + b('select-body').toString()}, checkboxlist),
        D.div({className: 'panel-footer ' + b('select-footer').toString()},
          D.button({className: 'btn btn-primary', onClick: this.handlePrint}, 'Print')
        )
      );

      preview = iframe;
    } else {
      preview = D.div({className: b('body-inner').toString()},
        D.div({className: b('body-content').toString()}, iframe),
        D.div({className: 'panel-footer ' + b('body-footer').toString()},
          D.button({className: 'btn btn-primary', onClick: this.handlePrint}, 'Print')
        )
      );
    }

    return D.div({className: b('').toString(), style: this.props.style},
      D.div({className: b('body').toString()},
        D.div({className: 'panel panel-default ' + b('preview').toString()}, preview),
        aside
      )
    );
  }
}

export type component = PrintComponent;
export const component = PrintComponent;
export const factory = createFactory(component);
export default component;
