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

package com.metaphacts.templates.helper;

import java.util.Date;
import java.text.SimpleDateFormat;

import com.github.jknack.handlebars.Options;

public class DateTimeHelperSource {
    /**
     * Returns the current system time. Default format is "dd.MM.yyyy HH:mm:ss.SSS".
     * <p>Example:</p>
     * <pre><code>
     * [[currentDateTime]]
     * [[currentDateTime format="MM-dd-yyyy"]]
     * </code></pre>
     */
    public String currentDateTime(Options options) {
        String format = options.hash("format", "dd.MM.yyyy HH:mm:ss.SSS");
        SimpleDateFormat dateFormat = new SimpleDateFormat(format);
        Date date = new Date();
        return dateFormat.format(date);
    }
}
