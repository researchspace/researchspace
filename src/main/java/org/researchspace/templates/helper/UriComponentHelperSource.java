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

import static com.google.common.base.Preconditions.checkNotNull;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.net.URLDecoder;

import com.google.common.base.Charsets;

import com.github.jknack.handlebars.Options;

/**
 * Handlebars helpers to encode/decode a URI component.
 * <p>
 * Example:
 * </p>
 * 
 * <pre>
 * <code>
 * [[encodeUriComponent '?uri=http://example.com']]
 * [[decodeUriComponent '%3Furi%3Dhttp%3A%2F%2Fexample.com']]
 * </code>
 * </pre>
 */
public class UriComponentHelperSource {
    public String encodeUriComponent(String param0, Options options) {
        String uri = checkNotNull(param0, "Uri string must not be null.");
        try {
            String url = URLEncoder.encode(uri, Charsets.UTF_8.name());
            // convert the result to the result of JavaScript's encodeURIComponent function
            return url.replaceAll("\\+", "%20").replaceAll("\\%21", "!").replaceAll("\\%27", "'")
                    .replaceAll("\\%28", "(").replaceAll("\\%29", ")").replaceAll("\\%7E", "~");
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }

    public String decodeUriComponent(String param0, Options options) {
        String uri = checkNotNull(param0, "Uri string must not be null.");
        try {
            return URLDecoder.decode(uri, Charsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }
}
