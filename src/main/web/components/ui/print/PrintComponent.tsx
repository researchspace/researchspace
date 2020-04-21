/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { ReactNode, ReactElement, Children, CSSProperties } from 'react';
import * as D from 'react-dom-factories';
import * as Maybe from 'data.maybe';
import { findDOMNode } from 'react-dom';
import Frame from 'react-frame-component';
import * as Kefir from 'kefir';
import * as block from 'bem-cn';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { PageService } from 'platform/api/services/page';
import { ModuleRegistry } from 'platform/api/module-loader';
import { Component } from 'platform/api/components';
import { isValidChild, componentHasType } from 'platform/components/utils';

import { PrintSectionComponent, factory as PrintSectionComponentFactory } from './PrintSectionComponent';

import './print-component.scss';

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

  /**
   * Options for client-side pdf generation.
   * Only if set, the export button will be displayed.
   * Example:
   * ```
   * html-to-pdf='{
   *    "filename":"test-[[this.label]].pdf",
   *   "margin": 0,
   *   "image": {"type": "jpeg", "quality": 0.98},
   *   "html2canvas": {"dpi": 192, "letterRendering": true},
   *   "jsPDF": {"unit": "in", "format": "letter", "orientation": "portrait"}
   * }'
   * ```
   */
  htmlToPdf: {};
}

export interface State {
  sections?: ReadonlyArray<Section>;
  styles?: ReadonlyArray<ReactElement<any>>;
  html2pdfLoaded: boolean;
}

interface Section {
  readonly content: ReactElement<any>;
  readonly isSelected: boolean;
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
  // c.f. comment in componentDidMount
  observer = new MutationObserver(_.debounce(() => this.setStyles(), 500));
  private html2pdf;

  private frameRef?: Frame | null;

  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      sections: [],
      styles: [],
      html2pdfLoaded: false,
    };
  }

  componentDidMount() {
    this.loadHtml2Pdf();
    this.setPrintSections();

    // VD-257: setup a mutation overserver, to observe any changes to styles
    // i.e. for heavy libraries like highcharts the setStyle call at the setState callback
    // of setPrintSections might be too early and as such styles for highcharts might not be added
    // to the print iframe
    const target = document.querySelector('head');
    this.observer.observe(target, { subtree: false, characterData: false, childList: true });
  }

  componentWillUnmount() {
    this.observer.disconnect();
  }

  private loadHtml2Pdf = () => {
    if (this.props.htmlToPdf) {
      import('html2pdf.js').then((library) => {
        this.html2pdf = library;
        this.setState({ html2pdfLoaded: true });
      });
    }
  };

  private setPrintSections = () => {
    const printSections = [];

    Kefir.sequentially(0, this.props.pages)
      .map((page) => Rdf.iri(page))
      .flatMap(this.loadAndParseTemplate)
      .onValue((content) => {
        printSections.push(this.findPrintSections(content));
      })
      .onEnd(() => {
        const concatPrintSections = [].concat.apply([], printSections);
        const mergedPrintSections = this.mergePrintSections(concatPrintSections);
        const sections = mergedPrintSections.map((section) => {
          return {
            content: section,
            isSelected: section.props.defaultPrint,
          };
        });

        this.setState(
          {
            sections: sections,
          },
          this.setStyles
        );
      });
  };

  private mergePrintSections = (sections) => {
    const groups: { id: string; sections: ReactElement<any>[] }[] = [];

    sections.forEach((section) => {
      const id = section.props.id;

      const group = _.find(groups, { id });

      if (group) {
        group.sections.push(section);
      } else {
        groups.push({ id, sections: [section] });
      }
    });

    return groups.map((group) => {
      const first = group.sections[0];

      if (group.sections.length === 1) {
        return first;
      }

      const { id, label, defaultPrint } = first.props;

      return PrintSectionComponentFactory({ id, label, defaultPrint }, group.sections);
    });
  };

  private loadAndParseTemplate = (iri: Rdf.Iri): Kefir.Property<ReactNode> => {
    const repository = Maybe.fromNullable(this.context.semanticContext)
      .map((context) => context.repository)
      .getOrElse(undefined);

    return PageService.loadRenderedTemplate(iri, iri, { repository })
      .flatMap<ReactNode>((page) =>
        Kefir.fromPromise(
          ModuleRegistry.parseHtmlToReact(
            `
              <div>
                ${page.templateHtml}
              </div>
            `
          )
        ).map<ReactNode>((content) => D.div({}, content))
      )
      .toProperty();
  };

  private findPrintSections = (content: ReactNode, printSections?: ReactElement<any>[]): Array<ReactElement<any>> => {
    if (!printSections) {
      printSections = [];
    }

    if (!content) {
      return null;
    }

    if (componentHasType(content, PrintSectionComponent)) {
      printSections.push(content);
    } else if (isValidChild(content) && content.props.children) {
      Children.forEach(content.props.children, (child) => {
        this.findPrintSections(child, printSections);
      });
    }

    return printSections;
  };

  private setStyles = () => {
    ModuleRegistry.parseHtmlToReact(document.head.innerHTML).then((head) => {
      head = Array.isArray(head) ? head : [head];
      const styles = head.filter((item) => {
        return item.type === 'link' || item.type === 'style';
      });
      this.setState({
        styles: styles,
      });
    });
  };

  private handleCheck = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const sections = this.state.sections;
    const updatedSection: Section = {
      ...sections[index],
      isSelected: e.target.checked,
    };
    const newSections = [...sections];
    newSections.splice(index, 1, updatedSection);
    this.setState({ sections: newSections });
  };

  private handlePrint = () => {
    const iframe = findDOMNode(this.frameRef) as HTMLIFrameElement;

    // print iframe
    const print = iframe.contentWindow.document.execCommand('print', false, null); // for IE
    if (!print) {
      iframe.contentWindow.print();
    }
  };

  private getIframeBody(iframe: any) {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    return iframeDocument.querySelector('body');
  }

  private handleExportAsPDF = () => {
    const iframe = findDOMNode(this.frameRef) as HTMLIFrameElement;
    const content = this.getIframeBody(iframe);
    this.html2pdf(content, this.props.htmlToPdf);
  };

  public render() {
    let aside: ReactElement<any>;
    let preview: ReactElement<any>;

    const sections = this.state.sections;

    const selectedSections = sections
      .filter((section) => {
        return section.isSelected;
      })
      .map((section) => {
        return D.div({ key: section.content.props.id }, section.content);
      });

    const b = block(this.props.className || DEFAULT_CLASS);

    const iframe = (
      <Frame
        ref={this.onFrameMount}
        className={b('iframe').toString()}
        head={
          <div>
            {this.state.styles}
            <style>{'.hidden-print {display: none} .frame-content {padding: 20px}'}</style>
          </div>
        }
      >
        {selectedSections}
      </Frame>
    );

    if (sections.length > 1) {
      const checkboxlist = sections.map((section, index) => {
        const { id, label } = section.content.props;
        return D.div(
          { className: 'checkbox', key: id },
          D.label(
            {},
            D.input({
              type: 'checkbox',
              value: label,
              checked: section.isSelected,
              onChange: this.handleCheck.bind(this, index),
            }),
            label
          )
        );
      });

      aside = D.div(
        { className: 'panel panel-default ' + b('select').toString() },
        D.div({ className: 'panel-heading ' + b('select-header').toString() }, 'Print Sections'),
        D.div({ className: 'panel-body ' + b('select-body').toString() }, checkboxlist),
        D.div(
          { className: 'panel-footer ' + b('select-footer').toString() },
          D.button(
            {
              className: 'btn btn-primary',
              onClick: this.handlePrint,
              title:
                'Recommended option for native or PDF printing. Uses native browser print ' +
                'functionlity. Requires Unix, Mac, Windows >10 or a PDF Print Driver being installed.',
            },
            'Print PDF'
          ),
          ' ',
          this.props.htmlToPdf && this.state.html2pdfLoaded
            ? D.button(
                {
                  className: 'btn btn-primary',
                  onClick: this.handleExportAsPDF,
                  title: 'Client-side export to PDF. Only recommended if no PDF print driver' + 'is available.',
                },
                'Export as PDF'
              )
            : null
        )
      );

      preview = iframe;
    } else {
      preview = D.div(
        { className: b('body-inner').toString() },
        D.div({ className: b('body-content').toString() }, iframe),
        D.div(
          { className: 'panel-footer ' + b('body-footer').toString() },
          D.button({ className: 'btn btn-primary', onClick: this.handlePrint }, 'Print'),
          ' ',
          D.button({ className: 'btn btn-primary', onClick: this.handleExportAsPDF }, 'Export as PDF')
        )
      );
    }

    return D.div(
      { className: b('').toString(), style: this.props.style },
      D.div(
        { className: b('body').toString() },
        D.div({ className: 'panel panel-default ' + b('preview').toString() }, preview),
        aside
      )
    );
  }

  private onFrameMount = (frameRef: Frame | null) => {
    this.frameRef = frameRef;
  };
}

export default PrintComponent;
