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

package com.metaphacts.templates;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.github.jknack.handlebars.EscapingStrategy;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Helper;
import com.github.jknack.handlebars.Options;
import com.github.jknack.handlebars.cache.ConcurrentMapTemplateCache;
import com.github.jknack.handlebars.io.TemplateLoader;
import com.google.inject.Singleton;
import com.metaphacts.templates.helper.DocumentationHelper;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Alexey Morozov
 */
@Singleton
public class MetaphactsHandlebars extends Handlebars{

    private static final Logger logger = LogManager.getLogger(MetaphactsHandlebars.class);

    public static final String startDelimiter="[[";
    public static final String endDelimiter="]]";

    public MetaphactsHandlebars(TemplateLoader templateLoader, HandlebarsHelperRegistry helperRegistry) {
        super();
        initialize(templateLoader, helperRegistry);
    }

    private void initialize(TemplateLoader templateLoader, HandlebarsHelperRegistry helperRegistry) {

        ConcurrentMapTemplateCache cache = new ConcurrentMapTemplateCache().setReload(true);

        if(templateLoader!=null){
            with(templateLoader);
        }
        with(cache);
        startDelimiter(startDelimiter);
        endDelimiter(endDelimiter);
        setPrettyPrint(true);
        registerHelperMissing(new Helper<Object>() {
            @Override
            public CharSequence apply(final Object context, final Options options) throws MissingHelperException {
              throw new MissingHelperException("Missing helper: " + options.fn.text() +"\nTemplate: "+options.fn.filename()+ " Line: "+options.fn.position()[0] +" Column "+options.fn.position()[1] );
            }
        });
        with(EscapingStrategy.NOOP);
        registerMetaphactsHelper(helperRegistry);
        if(templateLoader!=null){
            logger.debug("Initialized backend handlebars engine with template loader:  " + templateLoader.getClass());
        }else{
            logger.debug("Initialized backend handlebars engine with no template loader. Default (classpath) template loader will be used.");
        }

    }

    private void registerMetaphactsHelper(HandlebarsHelperRegistry helperRegistry) {
        helperRegistry.getHelpers().forEach(this::registerHelpers);

        // register DocumentationHelper
        registerHelper("documentation", new DocumentationHelper());

        if (logger.isDebugEnabled()) {
            logger.debug("Registered the following handlebars template helper: \n" + this.helpers());
        }
    }
}
