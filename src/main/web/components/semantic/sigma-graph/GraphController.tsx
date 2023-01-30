/**
 * Copyright (C) 2022, Swiss Art Research Infrastructure, University of Zurich
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
import { useState } from 'react';
export interface GraphControllerProps {
    /**
     * HTML id
     */
    id?: string;

    children?: React.ReactNode;
}

export const GraphController: React.FC<GraphControllerProps> = ({id, children}: GraphControllerProps) => {
    const [layoutRun, setLayoutRun] = useState(true)

    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { layoutRun: layoutRun, setLayoutRun: setLayoutRun });
        }
    });
    
    const toggleLayout = () => {
        setLayoutRun(!layoutRun);
        console.log("runLayout", layoutRun)
    }

    const runFor = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return child.props.runFor;
        }
    })[0] || false;

    if (runFor) {
        setTimeout(() => {
            setLayoutRun(false);
        }, runFor);
    }

    return (
        <div id={id}>
            {childrenWithProps}
            <button onClick={toggleLayout}>Toggle Layout</button>
        </div>
    );
};

export default GraphController;