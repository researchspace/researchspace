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
import {LazyLog} from 'react-lazylog';
import * as styles from './LogBrowser.scss';

export interface LogBrowserProps {
    /**
     * Relative /rest endpoint url
     * @example /rest/admin/logs/{log-filename}
     */
    url: string
}

/**
 * It is a component which allow admin to browse server logs.
 * @example
 * <mp-admin-log-browser url='/rest/admin/logs/log-xy123.log'></mp-admin-log-browser>
 */
export class LogBrowser extends React.Component<LogBrowserProps> {
    render() {
        return <div className={styles.adminLogBrowser}>
            <LazyLog
                extraLines={1}
                enableSearch
                url={this.props.url}
                fetchOptions={{credentials: 'include'}}>
            </LazyLog>
        </div>;
    }
}

export default LogBrowser;
