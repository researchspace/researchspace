/**
 * ResearchSpace
 * Copyright (C) 2023, Kartography
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
import { HTMLAttributes, CSSProperties, Children } from 'react';
import { listen } from 'platform/api/events';
import {SemanticSearchFormQueryExecuted} from '../../semantic/search/web-components/SemanticSearchFormQueryEvents'


export interface BackButtonProps extends HTMLAttributes<HTMLElement> {
    /**
     * ID of the element to hide when back button is clicked
     */
    elementIdToHide?: string;

    /**
     * ID of the element to show when back button is clicked
     */
    elementIdToShow?: string;
    
    /**
     * ID of the error alert element to hide when back button is clicked
     */
    errorAlertId?: string;

    /**
     * CSS class name that will override the button class
     */
    className?: string;
}

function hideElement(id) {
    const el = document.getElementById(id)
    if (el) {
        el.style.visibility = 'hidden'
        el.style.height = '0'
    }
}

function showElement(id) {
    const el = document.getElementById(id)
    if (el) {
        el.style.visibility = 'visible'
        el.style.height = '100%'
    }
}

export class BackButton extends React.Component<BackButtonProps> {

    componentDidMount() {
        // when a semantic search form query is executed, restore initial style for all elements hidden or shown by the back button component
        listen({ eventType: SemanticSearchFormQueryExecuted }).onValue(() => {
            showElement(this.props.errorAlertId)
            showElement(this.props.elementIdToHide)
            hideElement(this.props.elementIdToShow)
        });
    }
    
    public onClickHandler = () => {
        const {elementIdToHide, elementIdToShow, errorAlertId} = this.props

        if(elementIdToHide) {
            hideElement(elementIdToHide)
        }

        if(elementIdToShow) {
            showElement(elementIdToShow)
        }

        if(errorAlertId) {
            hideElement(errorAlertId)
        }
    }

  render() {

    return (
        <button className={this.props.className || 'btn btn-default'} onClick={this.onClickHandler}>{this.props.children}</button>
    );
  }
}

export default BackButton
