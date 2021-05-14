/**
 * ResearchSpace
 * Copyright (C) 2021, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import * as uuid from 'uuid';
import * as React from 'react';
import Frame, { FrameContextConsumer } from 'react-frame-component';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { FileManager } from 'platform/api/services/file-manager';
import { Component, ComponentProps } from 'platform/api/components';

import { createDirectField, makeComposite, RdfType, valueFromRdf } from '../text-annotation/model/AnnotationSchema';
import { xsd } from 'platform/api/rdf/vocabularies';
import { crm } from 'platform/data/vocabularies';
import { SparqlPersistence } from '../forms/persistence/SparqlPersistence';
import { FieldValue } from '../forms';

function IFRAME_INITIAL_CONTENT(editorId: string, pdfUrl: string, snippets: any[]) {
    return `<!DOCTYPE html>
<html dir="ltr" >
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="google" content="notranslate">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <link rel="stylesheet" href="/assets/no_auth/pdfjs/viewer.css">
    <link rel="resource" type="application/l10n" href="/assets/no_auth/pdfjs/locale/locale.properties">
    <script>
      window.rsPdfJs = {};
      window.rsPdfJs.editorId="${editorId}";
      window.rsPdfJs.pdfUrl="${pdfUrl}";
      window.rsPdfJs.annotations=JSON.parse('${JSON.stringify(snippets)}');
    </script>
    <script src="/assets/no_auth/pdfjs/pdf.js"></script>
    <script src="/assets/no_auth/pdfjs/viewer.js"></script>
    <script src="/assets/no_auth/pdfjs/annotator.js"></script>
  </head>
  <body tabindex="1">
    <div id="mountPoint"></div>

    <div id="outerContainer">

      <div id="sidebarContainer">
        <div id="toolbarSidebar">
          <div id="toolbarSidebarLeft">
            <div class="splitToolbarButton toggled">
              <button id="viewThumbnail" class="toolbarButton toggled" title="Show Thumbnails" tabindex="2" data-l10n-id="thumbs">
                 <span data-l10n-id="thumbs_label">Thumbnails</span>
              </button>
              <button id="viewAnnotations" class="toolbarButton" title="Show Annotations" tabindex="3" data-l10n-id="annotations">
               <span data-l10n-id="annotations_label">Annotations</span>
              </button>
              <button id="viewOutline" class="toolbarButton" title="Show Document Outline (double-click to expand/collapse all items)" tabindex="4" data-l10n-id="document_outline">
                 <span data-l10n-id="document_outline_label">Document Outline</span>
              </button>
            </div>
          </div>

          <div id="toolbarSidebarRight" class="hidden">
            <div id="outlineOptionsContainer" class="hidden">
              <div class="verticalToolbarSeparator"></div>

              <button id="currentOutlineItem" class="toolbarButton" disabled="disabled" title="Find Current Outline Item" tabindex="6" data-l10n-id="current_outline_item">
                <span data-l10n-id="current_outline_item_label">Current Outline Item</span>
              </button>
            </div>
          </div>
        </div>
        <div id="sidebarContent">
          <div id="thumbnailView">
          </div>
          <div id="outlineView" class="hidden">
          </div>
          <div id="attachmentsView" class="hidden">
          </div>
          <div id="layersView" class="hidden">
          </div>
          <div id="annotationsView" class="hidden">
          </div>
        </div>
        <div id="sidebarResizer"></div>
      </div>

      <div id="mainContainer">
        <div class="findbar hidden doorHanger" id="findbar">
          <div id="findbarInputContainer">
            <input id="findInput" class="toolbarField" title="Find" placeholder="Find in document…" tabindex="91" data-l10n-id="find_input">
            <div class="splitToolbarButton">
              <button id="findPrevious" class="toolbarButton findPrevious" title="Find the previous occurrence of the phrase" tabindex="92" data-l10n-id="find_previous">
                <span data-l10n-id="find_previous_label">Previous</span>
              </button>
              <div class="splitToolbarButtonSeparator"></div>
              <button id="findNext" class="toolbarButton findNext" title="Find the next occurrence of the phrase" tabindex="93" data-l10n-id="find_next">
                <span data-l10n-id="find_next_label">Next</span>
              </button>
            </div>
          </div>

          <div id="findbarOptionsOneContainer">
            <input type="checkbox" id="findHighlightAll" class="toolbarField" tabindex="94">
            <label for="findHighlightAll" class="toolbarLabel" data-l10n-id="find_highlight">Highlight all</label>
            <input type="checkbox" id="findMatchCase" class="toolbarField" tabindex="95">
            <label for="findMatchCase" class="toolbarLabel" data-l10n-id="find_match_case_label">Match case</label>
          </div>
          <div id="findbarOptionsTwoContainer">
            <input type="checkbox" id="findEntireWord" class="toolbarField" tabindex="96">
            <label for="findEntireWord" class="toolbarLabel" data-l10n-id="find_entire_word_label">Whole words</label>
            <span id="findResultsCount" class="toolbarLabel hidden"></span>
          </div>

          <div id="findbarMessageContainer">
            <span id="findMsg" class="toolbarLabel"></span>
          </div>
        </div>

        <div id="secondaryToolbar" class="secondaryToolbar hidden doorHangerRight">
          <div id="secondaryToolbarButtonContainer">
            <button id="secondaryPresentationMode" class="secondaryToolbarButton presentationMode visibleLargeView" title="Switch to Presentation Mode" tabindex="51" data-l10n-id="presentation_mode">
              <span data-l10n-id="presentation_mode_label">Presentation Mode</span>
            </button>

            <button id="secondaryOpenFile" class="secondaryToolbarButton openFile visibleLargeView" title="Open File" tabindex="52" data-l10n-id="open_file">
              <span data-l10n-id="open_file_label">Open</span>
            </button>

            <button id="secondaryPrint" class="secondaryToolbarButton print visibleMediumView" title="Print" tabindex="53" data-l10n-id="print">
              <span data-l10n-id="print_label">Print</span>
            </button>

            <button id="secondaryDownload" class="secondaryToolbarButton download visibleMediumView" title="Download" tabindex="54" data-l10n-id="download">
              <span data-l10n-id="download_label">Download</span>
            </button>

            <a href="#" id="secondaryViewBookmark" class="secondaryToolbarButton bookmark visibleSmallView" title="Current view (copy or open in new window)" tabindex="55" data-l10n-id="bookmark">
              <span data-l10n-id="bookmark_label">Current View</span>
            </a>

            <div class="horizontalToolbarSeparator visibleLargeView"></div>

            <button id="firstPage" class="secondaryToolbarButton firstPage" title="Go to First Page" tabindex="56" data-l10n-id="first_page">
              <span data-l10n-id="first_page_label">Go to First Page</span>
            </button>
            <button id="lastPage" class="secondaryToolbarButton lastPage" title="Go to Last Page" tabindex="57" data-l10n-id="last_page">
              <span data-l10n-id="last_page_label">Go to Last Page</span>
            </button>

            <div class="horizontalToolbarSeparator"></div>

            <button id="pageRotateCw" class="secondaryToolbarButton rotateCw" title="Rotate Clockwise" tabindex="58" data-l10n-id="page_rotate_cw">
              <span data-l10n-id="page_rotate_cw_label">Rotate Clockwise</span>
            </button>
            <button id="pageRotateCcw" class="secondaryToolbarButton rotateCcw" title="Rotate Counterclockwise" tabindex="59" data-l10n-id="page_rotate_ccw">
              <span data-l10n-id="page_rotate_ccw_label">Rotate Counterclockwise</span>
            </button>

            <div class="horizontalToolbarSeparator"></div>

            <button id="cursorSelectTool" class="secondaryToolbarButton selectTool toggled" title="Enable Text Selection Tool" tabindex="60" data-l10n-id="cursor_text_select_tool">
              <span data-l10n-id="cursor_text_select_tool_label">Text Selection Tool</span>
            </button>
            <button id="cursorHandTool" class="secondaryToolbarButton handTool" title="Enable Hand Tool" tabindex="61" data-l10n-id="cursor_hand_tool">
              <span data-l10n-id="cursor_hand_tool_label">Hand Tool</span>
            </button>

            <div class="horizontalToolbarSeparator"></div>

            <button id="scrollVertical" class="secondaryToolbarButton scrollModeButtons scrollVertical toggled" title="Use Vertical Scrolling" tabindex="62" data-l10n-id="scroll_vertical">
              <span data-l10n-id="scroll_vertical_label">Vertical Scrolling</span>
            </button>
            <button id="scrollHorizontal" class="secondaryToolbarButton scrollModeButtons scrollHorizontal" title="Use Horizontal Scrolling" tabindex="63" data-l10n-id="scroll_horizontal">
              <span data-l10n-id="scroll_horizontal_label">Horizontal Scrolling</span>
            </button>
            <button id="scrollWrapped" class="secondaryToolbarButton scrollModeButtons scrollWrapped" title="Use Wrapped Scrolling" tabindex="64" data-l10n-id="scroll_wrapped">
              <span data-l10n-id="scroll_wrapped_label">Wrapped Scrolling</span>
            </button>

            <div class="horizontalToolbarSeparator scrollModeButtons"></div>

            <button id="spreadNone" class="secondaryToolbarButton spreadModeButtons spreadNone toggled" title="Do not join page spreads" tabindex="65" data-l10n-id="spread_none">
              <span data-l10n-id="spread_none_label">No Spreads</span>
            </button>
            <button id="spreadOdd" class="secondaryToolbarButton spreadModeButtons spreadOdd" title="Join page spreads starting with odd-numbered pages" tabindex="66" data-l10n-id="spread_odd">
              <span data-l10n-id="spread_odd_label">Odd Spreads</span>
            </button>
            <button id="spreadEven" class="secondaryToolbarButton spreadModeButtons spreadEven" title="Join page spreads starting with even-numbered pages" tabindex="67" data-l10n-id="spread_even">
              <span data-l10n-id="spread_even_label">Even Spreads</span>
            </button>

            <div class="horizontalToolbarSeparator spreadModeButtons"></div>

            <button id="documentProperties" class="secondaryToolbarButton documentProperties" title="Document Properties…" tabindex="68" data-l10n-id="document_properties">
              <span data-l10n-id="document_properties_label">Document Properties…</span>
            </button>
          </div>
        </div>

        <div class="toolbar">
          <div id="toolbarContainer">
            <div id="toolbarViewer">
              <div id="toolbarViewerLeft">
                <button id="sidebarToggle" class="toolbarButton" title="Toggle Sidebar" tabindex="11" data-l10n-id="toggle_sidebar" aria-expanded="false" aria-controls="sidebarContainer">
                  <span data-l10n-id="toggle_sidebar_label">Toggle Sidebar</span>
                </button>
                <div class="toolbarButtonSpacer"></div>

                <div class="splitToolbarButton">
                  <button id="zoomOut" class="toolbarButton zoomOut" title="Zoom Out" tabindex="12" data-l10n-id="zoom_out">
                    <span data-l10n-id="zoom_out_label">Zoom Out</span>
                  </button>
                  <button id="zoomIn" class="toolbarButton zoomIn" title="Zoom In" tabindex="13" data-l10n-id="zoom_in">
                    <span data-l10n-id="zoom_in_label">Zoom In</span>
                  </button>
                  <button id="zoomAuto" class="toolbarButton zoomAuto" title="Zoom Auto" tabindex="14" data-l10n-id="zoom_auto">
                    <span data-l10n-id="zoom_auto_label">Zoom Auto</span>
                  </button>
                </div>

                <div class="splitToolbarButton hiddenSmallView">
                  <button class="toolbarButton pageUp" title="Previous Page" id="previous" tabindex="15" data-l10n-id="previous">
                    <span data-l10n-id="previous_label">Previous</span>
                  </button>
                  <button class="toolbarButton pageDown" title="Next Page" id="next" tabindex="16" data-l10n-id="next">
                    <span data-l10n-id="next_label">Next</span>
                  </button>
                </div>
                <input type="number" id="pageNumber" class="toolbarField pageNumber" title="Page" value="1" size="4" min="1" tabindex="17" data-l10n-id="page" autocomplete="off">
                <span id="numPages" class="toolbarLabel"></span>
              </div>
              <div id="toolbarViewerRight">
                <button id="viewFind" class="toolbarButton" title="Find in Document" tabindex="22" data-l10n-id="findbar" aria-expanded="false" aria-controls="findbar">
                  <span data-l10n-id="findbar_label">Find</span>
                </button>

                <button id="presentationMode" class="toolbarButton presentationMode hiddenLargeView" title="Switch to Presentation Mode" tabindex="31" data-l10n-id="presentation_mode">
                  <span data-l10n-id="presentation_mode_label">Presentation Mode</span>
                </button>

                <button id="openFile" class="toolbarButton openFile hiddenLargeView" title="Open File" tabindex="32" data-l10n-id="open_file">
                  <span data-l10n-id="open_file_label">Open</span>
                </button>

                <button id="print" class="toolbarButton print hiddenMediumView" title="Print" tabindex="33" data-l10n-id="print">
                  <span data-l10n-id="print_label">Print</span>
                </button>

                <button id="download" class="toolbarButton download hiddenMediumView" title="Download" tabindex="34" data-l10n-id="download">
                  <span data-l10n-id="download_label">Download</span>
                </button>
                <a href="#" id="viewBookmark" class="toolbarButton bookmark hiddenSmallView" title="Current view (copy or open in new window)" tabindex="35" data-l10n-id="bookmark">
                  <span data-l10n-id="bookmark_label">Current View</span>
                </a>

                <div class="verticalToolbarSeparator hiddenSmallView"></div>

                <button id="secondaryToolbarToggle" class="toolbarButton" title="Tools" tabindex="36" data-l10n-id="tools" aria-expanded="false" aria-controls="secondaryToolbar">
                  <span data-l10n-id="tools_label">Tools</span>
                </button>
              </div>
              <div id="toolbarViewerMiddle">
                <span id="scaleSelectContainer" class="dropdownToolbarButton">
                  <select id="scaleSelect" title="Zoom" tabindex="23" data-l10n-id="zoom">
                    <option id="pageAutoOption" title="" value="auto" selected="selected" data-l10n-id="page_scale_auto">Automatic Zoom</option>
                    <option id="pageActualOption" title="" value="page-actual" data-l10n-id="page_scale_actual">Actual Size</option>
                    <option id="pageFitOption" title="" value="page-fit" data-l10n-id="page_scale_fit">Page Fit</option>
                    <option id="pageWidthOption" title="" value="page-width" data-l10n-id="page_scale_width">Page Width</option>
                    <option id="customScaleOption" title="" value="custom" disabled="disabled" hidden="true"></option>
                    <option title="" value="0.5" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 50 }'>50%</option>
                    <option title="" value="0.75" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 75 }'>75%</option>
                    <option title="" value="1" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 100 }'>100%</option>
                    <option title="" value="1.25" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 125 }'>125%</option>
                    <option title="" value="1.5" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 150 }'>150%</option>
                    <option title="" value="2" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 200 }'>200%</option>
                    <option title="" value="3" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 300 }'>300%</option>
                    <option title="" value="4" data-l10n-id="page_scale_percent" data-l10n-args='{ "scale": 400 }'>400%</option>
                  </select>
                </span>
              </div>
            </div>
            <div id="loadingBar">
              <div class="progress">
                <div class="glimmer">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="viewerContainer" tabindex="0">
          <div id="viewer" class="pdfViewer"></div>
        </div>

        <div id="errorWrapper" hidden='true'>
          <div id="errorMessageLeft">
            <span id="errorMessage"></span>
            <button id="errorShowMore" data-l10n-id="error_more_info">
              More Information
            </button>
            <button id="errorShowLess" data-l10n-id="error_less_info" hidden='true'>
              Less Information
            </button>
          </div>
          <div id="errorMessageRight">
            <button id="errorClose" data-l10n-id="error_close">
              Close
            </button>
          </div>
          <div class="clearBoth"></div>
          <textarea id="errorMoreInfo" hidden='true' readonly="readonly"></textarea>
        </div>
      </div>

      <div id="overlayContainer" class="hidden">
        <div id="passwordOverlay" class="container hidden">
          <div class="dialog">
            <div class="row">
              <p id="passwordText" data-l10n-id="password_label">Enter the password to open this PDF file:</p>
            </div>
            <div class="row">
              <input type="password" id="password" class="toolbarField">
            </div>
            <div class="buttonRow">
              <button id="passwordCancel" class="overlayButton"><span data-l10n-id="password_cancel">Cancel</span></button>
              <button id="passwordSubmit" class="overlayButton"><span data-l10n-id="password_ok">OK</span></button>
            </div>
          </div>
        </div>
        <div id="documentPropertiesOverlay" class="container hidden">
          <div class="dialog">
            <div class="row">
              <span data-l10n-id="document_properties_file_name">File name:</span> <p id="fileNameField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_file_size">File size:</span> <p id="fileSizeField">-</p>
            </div>
            <div class="separator"></div>
            <div class="row">
              <span data-l10n-id="document_properties_title">Title:</span> <p id="titleField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_author">Author:</span> <p id="authorField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_subject">Subject:</span> <p id="subjectField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_keywords">Keywords:</span> <p id="keywordsField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_creation_date">Creation Date:</span> <p id="creationDateField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_modification_date">Modification Date:</span> <p id="modificationDateField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_creator">Creator:</span> <p id="creatorField">-</p>
            </div>
            <div class="separator"></div>
            <div class="row">
              <span data-l10n-id="document_properties_producer">PDF Producer:</span> <p id="producerField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_version">PDF Version:</span> <p id="versionField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_page_count">Page Count:</span> <p id="pageCountField">-</p>
            </div>
            <div class="row">
              <span data-l10n-id="document_properties_page_size">Page Size:</span> <p id="pageSizeField">-</p>
            </div>
            <div class="separator"></div>
            <div class="row">
              <span data-l10n-id="document_properties_linearized">Fast Web View:</span> <p id="linearizedField">-</p>
            </div>
            <div class="buttonRow">
              <button id="documentPropertiesClose" class="overlayButton"><span data-l10n-id="document_properties_close">Close</span></button>
            </div>
          </div>
        </div>
        <div id="printServiceOverlay" class="container hidden">
          <div class="dialog">
            <div class="row">
              <span data-l10n-id="print_progress_message">Preparing document for printing…</span>
            </div>
            <div class="row">
              <progress value="0" max="100"></progress>
              <span data-l10n-id="print_progress_percent" data-l10n-args='{ "progress": 0 }' class="relative-progress">0%</span>
            </div>
            <div class="buttonRow">
              <button id="printCancel" class="overlayButton"><span data-l10n-id="print_progress_close">Cancel</span></button>
            </div>
          </div>
        </div>
      </div>

    </div>
    <div id="printContainer"></div>
  </body>
</html>
  `;
}

const R5iIsComponentOf = createDirectField(Rdf.iri('http://iflastandards.info/ns/fr/frbr/frbroo/R5i_is_component_of'), { id: 'R5i_is_component_of', xsdDatatype: xsd.anyURI });

const P190_has_symbolic_content = createDirectField(crm.P190_has_symbolic_content, {
    id: 'P190_has_symbolic_content',
    xsdDatatype: xsd._string,
});

const P1_is_identified_by = createDirectField(crm.P1_is_identified_by, {
    id: 'P1_is_identified_by',
    xsdDatatype: xsd.anyURI,
});

const P2_has_type = createDirectField(crm.P2_has_type, {
    id: 'P2_has_type',
    xsdDatatype: xsd.anyURI,
});

const PX_zotero_sort_index = createDirectField(Rdf.iri('http://www.researchspace.org/ontology/PX_zotero_sort_index'), {
    id: 'PX_zotero_sort_index',
    xsdDatatype: xsd._string,
});


interface PdfAnnotatorProps extends ComponentProps {
    documentIri: string
    storage: string
}

interface PdfAnnotatorState {
    pdfUrl?: string
    // pagenumber to page iri
    pages?: { [page: string]: string }
    snippets?: any[]
}

class PdfAnnotator extends Component<PdfAnnotatorProps, PdfAnnotatorState> {
    private frameDocument: HTMLDocument = null;
    private editorId = uuid.v4();

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    componentDidMount() {
        const { repository } = this.context.semanticContext;
        const fileManager = new FileManager({ repository });

        // get document file
        const query = SparqlUtil.parseQuery(
            `
SELECT ?file {
  ?document crm:P165_incorporates/crm:P128i_is_carried_by/crm:P1_is_identified_by ?file .
  ?file a rso:EX_File
}
      `
        );
        this.cancel.map(
            SparqlClient.select(
                SparqlClient.setBindings(query, { 'document': Rdf.iri(this.props.documentIri) })
            ).flatMap(
                res => fileManager.getFileResource(res.results.bindings[0].file as Rdf.Iri, { namePredicateIri: 'http://www.researchspace.org/ontology/PX_has_file_name', mediaTypePredicateIri: 'http://www.researchspace.org/ontology/PX_has_media_type' })
            ).map(
                resource => FileManager.getFileUrl(resource.fileName, this.props.storage)
            )
        ).onValue(
            pdfUrl => this.setState({ pdfUrl })
        );

        this.getDocumentPages();
        this.getSnippets();
    }

    private getDocumentPages() {
        const query = SparqlUtil.parseQuery(
            `
SELECT ?page ?pageNumber {
  ?document crm:P165_incorporates/frbroo:R5_has_component ?page .
  ?page crm:P1_is_identified_by/crm:P190_has_symbolic_content ?pageNumber .
}
      `
        );
        this.cancel.map(
            SparqlClient.select(
                SparqlClient.setBindings(query, { 'document': Rdf.iri(this.props.documentIri) })
            )
        ).onValue(
            res => {
                const pages = {};
                // in the data pages start from 1 but in zotero annotator from 0
                res.results.bindings.forEach(
                    b => pages[parseInt(b.pageNumber.value) - 1] = b.page.value
                );
                this.setState({ pages });
            }
        );
    }

    private getSnippets() {
        const query = SparqlUtil.parseQuery(
            `
SELECT ?page ?pageNumber ?snippet ?text ?snippetType ?position ?sortIndex {
  ?document crm:P165_incorporates/frbroo:R5_has_component ?page .
  ?page crm:P1_is_identified_by/crm:P190_has_symbolic_content ?pageNumber .
  ?snippet frbroo:R5i_is_component_of ?page .
  ?snippet crm:P1_is_identified_by ?identifier .
  ?identifier crm:P2_has_type ?snippetType .
  ?identifier crm:P190_has_symbolic_content ?position .
  ?identifier rso:PX_zotero_sort_index ?sortIndex .

  OPTIONAL {
    ?snippet crm:P190_has_symbolic_content ?text .
  }
}
      `
        );
        this.cancel.map(
            SparqlClient.select(
                SparqlClient.setBindings(query, { 'document': Rdf.iri(this.props.documentIri) })
            )
        ).onValue(
            res => {
                const snippets = res.results.bindings.map(
                    b => {
                        const snippet: any = {
                            type: _.last(b.snippetType.value.split('/')),
                            id: _.last(b.snippet.value.split('/')),
                            color: '#ffd400',
                            position: {
                                pageIndex: parseInt(b.pageNumber.value) - 1,
                                rects: JSON.parse(b.position.value)
                            },
                            authorName: '',
                            dateModified: '2020-02-19T12:53:23.582Z',
                            sortIndex: '00000|003202|00000',
                            tags: [],
                            pageLabel: b.pageNumber.value
                        };
                        if (snippet.type === 'highlight') {
                            snippet.text = b.text.value;
                        }
                        return snippet;
                    }
                );
                this.setState({ snippets });
            }
        );
    }

    render() {
        console.log(window.self.origin)
        if (this.state.pdfUrl && this.state.snippets) {
            return (
                <Frame
                    initialContent={
                        IFRAME_INITIAL_CONTENT(this.editorId, this.state.pdfUrl, this.state.snippets)
                    }
                    mountTarget="#mountPoint"
                >
                    <FrameContextConsumer>
                        {
                            // Callback is invoked with iframe's window and document instances
                            ({ document }) => {
                                this.listenToEvents(document);
                                return null;
                            }
                        }
                    </FrameContextConsumer>
                </Frame>
            );
        } else {
            return null;
        }
    }

    private getPersistence() {
        const { semanticContext } = this.context;
        return new SparqlPersistence({
            repository: semanticContext.repository,
            targetGraphIri: 'http://researchspace.org/text-annotations'
        });
    }


    private listenToEvents = (frameDocument: HTMLDocument) => {
        if (this.frameDocument == null) {

            console.log('start listen to events')
            this.frameDocument = frameDocument;

            frameDocument.addEventListener("pdfjs-SetAnnotation", (event: CustomEvent<{ editorId: string; annotation: any }>) => {
                if (event.detail.editorId === this.editorId) {
                    console.log('got event from iframe');
                    console.log(event.detail.annotation);

                    const annotation = event.detail.annotation;
                    if (!this.state.snippets.some(s => s.id === annotation.id)) {
                      //const snippetIri = `${this.props.documentIri}/snippet/${annotation.id}`;
                      const snippetIri = `http://researchspace.org/snippet/${annotation.id}`
                        const modelKps = [
                            { def: RdfType, value: valueFromRdf(Rdf.iri('http://iflastandards.info/ns/fr/frbr/frbroo/F22_Self-Contained_Expression')) },
                            {
                                def: R5iIsComponentOf,
                                value: valueFromRdf(Rdf.iri(this.state.pages[annotation.position.pageIndex]))
                            },
                            {
                                def: P1_is_identified_by,
                                value: makeComposite(
                                    null, `${snippetIri}/id`, [
                                    {
                                        def: RdfType, value: valueFromRdf(crm.E42_Identifier),
                                    },
                                    {
                                        def: P2_has_type, value: valueFromRdf(Rdf.iri('https://www.zotero.org/' + event.detail.annotation.type))
                                    },
                                    {
                                        def: P190_has_symbolic_content,
                                        value: valueFromRdf(Rdf.literal(JSON.stringify(annotation.position.rects)))
                                    },
                                    {
                                        def: PX_zotero_sort_index,
                                        value: valueFromRdf(Rdf.literal(annotation.sortIndex))
                                    }
                                ]
                                )
                            }
                        ];

                        if (annotation.type === 'highlight') {
                            modelKps.push(
                                {
                                    def: P190_has_symbolic_content,
                                    value: valueFromRdf(Rdf.literal(annotation.text))
                                }
                            );
                        }

                        const snippetModel = makeComposite(
                            null, snippetIri, modelKps
                        );

                        this.cancel.map(
                            this.getPersistence().persist(FieldValue.empty, snippetModel)
                        ).onValue(
                          () => {
                            this.state.snippets.push(annotation);
                            console.log('persisted')
                          }
                        )
                    }
                }
            });
        }
    }
}

export default PdfAnnotator;
