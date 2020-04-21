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

package org.researchspace.servlet.filter;

import java.io.IOException;
import java.util.Optional;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringUtils;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.researchspace.config.Configuration;
import org.researchspace.config.NamespaceRegistry;
import org.researchspace.config.NamespaceRegistry.RuntimeNamespace;

/**
 * Handles redirect to home page.
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 */
@Singleton
@WebFilter
public class HomePageFilter implements Filter {

    @Inject
    private NamespaceRegistry ns;

    @Inject
    private Configuration config;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = ((HttpServletRequest) request);
            String path = httpRequest.getRequestURI().substring(httpRequest.getContextPath().length());
            // TODO think on centralized path mappings
            if (httpRequest.getQueryString() == null && (path.isEmpty() || path.equals("/")
                    || path.equals(config.getEnvironmentConfig().getResourceUrlMapping()) || path.startsWith("/;"))) {
                redirectToStartPage(httpRequest, response);
            } else if (httpRequest.getQueryString() != null && path.equals("/")) {
                redirectToStartPage(httpRequest, response);
            } else {
                chain.doFilter(request, response);
            }
        } else {
            chain.doFilter(request, response);
        }
    }

    private void redirectToStartPage(HttpServletRequest httpRequest, ServletResponse response) throws IOException {
        String startPage = config.getGlobalConfig().getHomePage();

        final IRI startPageIRI = guessStartPage(startPage);

        Optional<String> prefixString = ns.getPrefix(startPageIRI.getNamespace()).map(prefix -> {
            if (prefix.equals(RuntimeNamespace.EMPTY)) {
                return startPageIRI.getLocalName();
            }
            return prefix + ":" + startPageIRI.getLocalName();
        });
        String newPath = "";
        if (prefixString.isPresent())
            newPath = httpRequest.getContextPath() + config.getEnvironmentConfig().getResourceUrlMapping()
                    + prefixString.get();
        else
            newPath = httpRequest.getContextPath() + config.getEnvironmentConfig().getResourceUrlMapping() + "?uri="
                    + startPageIRI.stringValue();

        HttpServletResponse httpServletResponse = (HttpServletResponse) response;
        httpServletResponse.sendRedirect(httpServletResponse.encodeRedirectURL(newPath));
        return;
    }

    private IRI guessStartPage(String startPage) {
        ValueFactory vf = SimpleValueFactory.getInstance();
        if (startPage.startsWith("<") && startPage.endsWith(">")) {
            return vf.createIRI(StringUtils.substringBetween(startPage, "<", ">"));
        } else if (ns.looksLikePrefixedIri(startPage) && ns.resolveToIRI(startPage).isPresent()) {
            return ns.resolveToIRI(startPage).get();
        }
        return vf.createIRI(ns.getDefaultNamespace(), startPage);
    }

    @Override
    public void destroy() {
    }
}