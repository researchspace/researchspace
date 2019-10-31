/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { expect, use } from 'chai';
import * as chaiString from 'chai-string';
// import { RAW_STYLE_ATTRIBUTE } from '../../../../main/common/ts/modules/Registry';
use(chaiString);

// mock registerElement function
// document.registerElement = (elem) => () => elem;

// import * as Registry from '../../../../main/common/ts/modules/Registry';
// Registry.init();

// interface ComponentProps extends Props<any> {
//   text: string;
//   style?: CSSProperties;
//   '__style'?: string;
// }

// describe('React Web-Components Registry', () => {
//   it('parse simple html into react tree', () => {
//     const html = '<div class="test"><a href="test"><b>Text</b></a></div>';

//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.deep.equal(html);
//   });

//   it('parse custom component into react tree', () => {
//     const component: SFC<ComponentProps> =
//       props => D.div({}, D.p({}, props.text, props.children));
//     Registry.registerReactComponent('my-component', component);

//     const html =
//       `
//        <div class="test">
//          <a href="test"><b>Text</b></a><my-component data-text="Test"></my-component>
//        </div>
//       `;
//     const expected =
//       '<div class="test"><a href="test"><b>Text</b></a><div><p>Test</p></div></div>';
//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.equalIgnoreSpaces(expected);
//   });

//   it('parse nested custom components into react tree', () => {
//     const component: SFC<ComponentProps> =
//       props => D.div({}, D.span({}, props.text, props.children));
//     Registry.registerReactComponent('my-component', component);

//     const html =
//       `
//         <div class="test">
//           <my-component data-text="Test">
//             <my-component data-text="Test2"></my-component>
//           </my-component>
//         </div>
//       `;
//     const expected =
//       `
//         <div class="test">
//           <div>
//             <span>
//               Test  <div><span>Test2</span></div>
//             </span>
//           </div>
//         </div>
//       `;
//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.equalIgnoreSpaces(expected);
//   });

//   it('preserves html for natively registered components', () => {
//     document.registerElement('my-custom-component');

//     const html =
//       `
//         <div class="tes">
//           <my-custom-component data-x="{&quot;hello&quot;: &quot;world&quot;}">
//             <b>Test</b>
//           </my-custom-component>
//         </div>
//       `;
//     const expected =
//       `
//         <div class="tes">
//           <div>
//             <my-custom-component data-x="{&quot;hello&quot;: &quot;world&quot;}">
//               <b>Test</b>
//             </my-custom-component>
//           </div>
//         </div>
//       `;
//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.equalIgnoreSpaces(expected);
//   });

//   it('properly parse style attribute to react format', () => {
//     const component: SFC<ComponentProps> =
//       props => D.div({}, D.p({style: props.style}, props.text));
//     Registry.registerReactComponent('my-component', component);

//     const html =
//       `
//        <div class="test">
//          <my-component data-text="Test" style="color: black; border: none;"></my-component>
//        </div>
//       `;
//     const expected =
//       `
//         <div class="test">
//           <div><p style="color: black; border: none;">Test</p></div>
//         </div>
//       `;
//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.equalIgnoreSpaces(expected);
//   });

//   it('preserves original style value', () => {
//     const component: SFC<ComponentProps> = props =>
//       D.div(
//         {
//           dangerouslySetInnerHTML: {
//             __html: `<p style="${props[RAW_STYLE_ATTRIBUTE]}">${props.text}</p>`,
//           },
//         }
//       );
//     Registry.registerReactComponent('my-component', component);

//     const html =
//       `
//        <div class="test">
//          <my-component data-text="Test" style="color: black; border: none;"></my-component>
//        </div>
//       `;

//     /**
//      * The final semicolon in the style value is removed because we minify html when
//      * parsing it into react, we should get rid of this minification when we switch to
//      * react 0.15
//      */
//     const expected =
//       `
//         <div class="test">
//           <div><p style="color: black; border: none">Test</p></div>
//         </div>
//       `;
//     const rendered = Registry.parseHtmlToReact(html);
//     expect(renderToStaticMarkup(rendered[0])).to.be.equalIgnoreSpaces(expected);
//   });
// });
