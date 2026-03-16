/* eslint-disable react/prop-types */

import * as React from 'react';
import { FC } from 'react';

export interface EdgeFilterControlProps {
    edgeLabels: {label: string, visible: boolean}[];
    setEdgeLabels: (edgeLabels: {label: string, visible: boolean}[]) => void;
}

export const EdgeFilterControl: FC<EdgeFilterControlProps> = (props) => {

    const onEdgeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const label = event.target.value;
        const newEdgeLabels = props.edgeLabels.map(d => {
            if (d.label === label) {
                return {...d, visible: event.target.checked};
            } else {
                return d;
            }
        });
        props.setEdgeLabels(newEdgeLabels);
    };

    const onEdgeFilterChangeAll = () => {
        if (allChecked) {
            const newEdgeLabels = props.edgeLabels.map(d => ({...d, visible: false}));
            props.setEdgeLabels(newEdgeLabels);
        } else {
            const newEdgeLabels = props.edgeLabels.map(d => ({...d, visible: true}));
            props.setEdgeLabels(newEdgeLabels);
        }
    };

    const allChecked = props.edgeLabels.every(d => d.visible);

    return <div>
        <ul className="filter edgeLabels">
            <li key="li-all">
                <input onChange={onEdgeFilterChangeAll} type="checkbox" id="edge-filter-all"
                    checked={allChecked}
                />&nbsp;
                <label htmlFor="edge-filter-all">(all)</label>
            </li>
            {props.edgeLabels.map(d => (
                <li key={"li-" + d.label}>
                    <input onChange={onEdgeFilterChange} type="checkbox" id={"edge-filter-" + d.label} value={d.label} 
                        checked={d.visible}
                    />&nbsp;
                    <label htmlFor={"edge-filter-" + d.label}>{d.label}</label>
                </li>
            ))}
        </ul>
    </div>
}

export default EdgeFilterControl