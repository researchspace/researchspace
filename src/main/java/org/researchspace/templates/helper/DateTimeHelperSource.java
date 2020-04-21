/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

package org.researchspace.templates.helper;

import java.util.Date;
import java.text.SimpleDateFormat;

import com.github.jknack.handlebars.Options;

public class DateTimeHelperSource {
    /**
     * Returns the current system time. Default format is "dd.MM.yyyy HH:mm:ss.SSS".
     * <p>
     * Example:
     * </p>
     * 
     * <pre>
     * <code>
     * [[currentDateTime]]
     * [[currentDateTime format="MM-dd-yyyy"]]
     * </code>
     * </pre>
     */
    public String currentDateTime(Options options) {
        String format = options.hash("format", "dd.MM.yyyy HH:mm:ss.SSS");
        SimpleDateFormat dateFormat = new SimpleDateFormat(format);
        Date date = new Date();
        return dateFormat.format(date);
    }
}
