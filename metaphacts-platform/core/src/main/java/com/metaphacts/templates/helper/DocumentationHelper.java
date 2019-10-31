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

import java.io.IOException;

import com.github.jknack.handlebars.Helper;
import com.github.jknack.handlebars.Options;

/**
 * Raw block helper for documentation purpose:
 * https://github.com/jknack/handlebars.java/issues/444
 * 
 * However, right now there is a bug in handlebars.java i.e. raw block helper does not allow to use
 * custom delimiters so you have to mix delimiters: 
 * <code>
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