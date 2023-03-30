/* eslint-disable react/prop-types */

import * as React from 'react';
import { FC } from 'react';

export interface EdgeFilterControlProps {
    edgeLabels: string[];
    visibleEdgeLabels: string[];
    setVisibleEdgeLabels: (labels: string[]) => void;
}

export const EdgeFilterControl: FC<EdgeFilterControlProps> = (props) => {

    const onEdgeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const label = event.target.value;
        if (event.target.checked) {
            props.setVisibleEdgeLabels([...props.visibleEdgeLabels, label]);
        } else {
            props.setVisibleEdgeLabels(props.visibleEdgeLabels.filter((l: string) => l !== label));
        }
    };

    return <div>
        <ul>
            {props.edgeLabels.map((label: string) => (
                <li key={"li-" + label}>
                    <input onChange={onEdgeFilterChange} type="checkbox" id={"edge-filter-" + label} value={label} 
                        checked={props.visibleEdgeLabels.includes(label)}
                    />&nbsp;
                    <label htmlFor={"edge-filter-" + label}>{label}</label>
                </li>
            ))}
        </ul>
    </div>
}

export default EdgeFilterControl