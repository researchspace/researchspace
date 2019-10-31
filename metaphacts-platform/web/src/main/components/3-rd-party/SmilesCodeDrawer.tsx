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

import * as React from 'react';
import {CSSProperties}  from 'react';

import { Component, ComponentContext} from 'platform/api/components';

import * as SmilesDrawer from 'smiles-drawer';



interface Props {
    smilesCode: string,
    options?: SmilesDrawer.Options,
    /**
    * Additional styles for label element
    */
    style?: CSSProperties

    theme?: 'light' | 'dark'
}
/**
 * @example
 <mp-smiles-code-drawer smiles-code='O[C@@H]1[C@H](O)[C@H](O)[C@H](O)[C@@H](CO)O1'>
 </mp-smiles-code-drawer>
 * @example
 <mp-smiles-code-drawer
                       smiles-code='O[C@@H]1[C@H](O)[C@H](O)[C@H](O)[C@@H](CO)O1'
                       theme='light'
                       options='{"width": "400", "height": "400"}'>
</mp-smiles-code-drawer>
 */
export class SmilesCodeDrawer extends Component<Props, {}> {
    private elementID = 'smiles-canvas -' + Math.random();
    private smilesDrawer;
    static defaultProps = {
        options: {width: 200, height: 200},
        theme: 'light',
    };

    constructor(props: Props, context: ComponentContext) {
        super(props, context);
        this.smilesDrawer = new SmilesDrawer.Drawer(this.props.options);
    }
    public render() {
        return (
            <canvas ref={this.renderSmilesCanvas} id={this.elementID} style={this.props.style}>
            </canvas>
        );
    }

    public componentDidUpdate (prevProps: Props, prevState: {}) {
            this.renderSmilesCanvas();
    }

    renderSmilesCanvas = () => {
        SmilesDrawer.parse(this.props.smilesCode,  (tree) => {
            this.smilesDrawer.draw(tree, this.elementID, this.props.theme );
        }, function (err) {
            console.log('Error while drawing the smiles structure: ' + err);
        });
    }
}


export default SmilesCodeDrawer;
