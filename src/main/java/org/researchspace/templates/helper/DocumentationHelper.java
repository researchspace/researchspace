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

import java.io.IOException;

import com.github.jknack.handlebars.Helper;
import com.github.jknack.handlebars.Options;

/**
 * Raw block helper for documentation purpose:
 * https://github.com/jknack/handlebars.java/issues/444
 * 
 * However, right now there is a bug in handlebars.java i.e. raw block helper
 * does not allow to use custom delimiters so you have to mix delimiters: <code>
 * [[{{documentation}}]] 
 *  [[test]]
 * [[{{/documentation}}]]
 * </code>
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class DocumentationHelper implements Helper<Object> {

    @Override
    public CharSequence apply(Object context, Options options) throws IOException {
        return options.fn();
    }

}