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

package org.researchspace.templates;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.researchspace.templates.helper.DocumentationHelper;

import com.github.jknack.handlebars.EscapingStrategy;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Helper;
import com.github.jknack.handlebars.Options;
import com.github.jknack.handlebars.cache.ConcurrentMapTemplateCache;
import com.github.jknack.handlebars.io.TemplateLoader;
import com.google.inject.Singleton;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 * @author Alexey Morozov
 */
@Singleton
public class ResearchSpaceHandlebars extends Handlebars {

    private static final Logger logger = LogManager.getLogger(ResearchSpaceHandlebars.class);

    public static final String startDelimiter = "[[";
    public static final String endDelimiter = "]]";

    public ResearchSpaceHandlebars(TemplateLoader templateLoader, HandlebarsHelperRegistry helperRegistry) {
        super();
        initialize(templateLoader, helperRegistry);
    }

    private void initialize(TemplateLoader templateLoader, HandlebarsHelperRegistry helperRegistry) {

        ConcurrentMapTemplateCache cache = new ConcurrentMapTemplateCache().setReload(true);

        if (templateLoader != null) {
            with(templateLoader);
        }
        with(cache);
        startDelimiter(startDelimiter);
        endDelimiter(endDelimiter);
        setPrettyPrint(true);
        registerHelperMissing(new Helper<Object>() {
            @Override
            public CharSequence apply(final Object context, final Options options) throws MissingHelperException {
                throw new MissingHelperException(
                        "Missing helper: " + options.fn.text() + "\nTemplate: " + options.fn.filename() + " Line: "
                                + options.fn.position()[0] + " Column " + options.fn.position()[1]);
            }
        });
        with(EscapingStrategy.NOOP);
        registerHelper(helperRegistry);
        if (templateLoader != null) {
            logger.debug("Initialized backend handlebars engine with template loader:  " + templateLoader.getClass());
        } else {
            logger.debug(
                    "Initialized backend handlebars engine with no template loader. Default (classpath) template loader will be used.");
        }

    }

    private void registerHelper(HandlebarsHelperRegistry helperRegistry) {
        helperRegistry.getHelpers().forEach(this::registerHelpers);

        // register DocumentationHelper
        registerHelper("documentation", new DocumentationHelper());

        if (logger.isDebugEnabled()) {
            logger.debug("Registered the following handlebars template helper: \n" + this.helpers());
        }
    }
}
