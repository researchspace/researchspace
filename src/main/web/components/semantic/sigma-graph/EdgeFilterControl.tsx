/* eslint-disable react/prop-types */
/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as React from 'react';
import { FC } from 'react';

export interface EdgeFilterControlProps {
    edgeLabels: {label: string, visible: boolean}[];
    setEdgeLabels: (edgeLabels: {label: string, visible: boolean}[]) => void;
}

export const EdgeFilterControl: FC<EdgeFilterControlProps> = (props) => {
    const [idPrefix] = React.useState(() => 'sigma-edge-filter-' + Math.random().toString(36).slice(2));

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
                <input onChange={onEdgeFilterChangeAll} type="checkbox" id={idPrefix + '-all'}
                    checked={allChecked}
                />&nbsp;
                <label htmlFor={idPrefix + '-all'}>(all)</label>
            </li>
            {props.edgeLabels.map((d, index) => (
                <li key={"li-" + d.label}>
                    <input onChange={onEdgeFilterChange} type="checkbox" id={idPrefix + '-' + index} value={d.label}
                        checked={d.visible}
                    />&nbsp;
                    <label htmlFor={idPrefix + '-' + index}>{d.label}</label>
                </li>
            ))}
        </ul>
    </div>
}

export default EdgeFilterControl
