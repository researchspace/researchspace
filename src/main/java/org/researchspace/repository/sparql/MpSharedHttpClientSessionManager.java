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

package org.researchspace.repository.sparql;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.HttpClientBuilder;
import org.eclipse.rdf4j.http.client.SharedHttpClientSessionManager;
import org.researchspace.config.Configuration;

import com.google.common.util.concurrent.ThreadFactoryBuilder;

/**
 * @author Johannes Trame <jt@metaphacts.com>
 *
 */
public class MpSharedHttpClientSessionManager extends SharedHttpClientSessionManager {

    private final ExecutorService executor;
    private final Configuration config;

    public MpSharedHttpClientSessionManager(Configuration config) {
        this.config = config;
        this.executor = Executors
                .newCachedThreadPool(new ThreadFactoryBuilder().setNameFormat("rdf4j-sesameclientimpl-%d").build());
        Integer maxConnections = this.config.getEnvironmentConfig().getMaxSparqlHttpConnections();
        Integer connectionTimeout = this.config.getEnvironmentConfig().getSparqlHttpConnectionTimeout();

        RequestConfig.Builder configBuilder = RequestConfig.custom();
        if (connectionTimeout != null) {
            configBuilder = configBuilder.setConnectTimeout(connectionTimeout * 1000);
            configBuilder = configBuilder.setSocketTimeout(connectionTimeout * 1000);
        }
        configBuilder.setCookieSpec(CookieSpecs.STANDARD);

        RequestConfig requestConfig = configBuilder.build();
        HttpClientBuilder mpHttpClientBuilder = HttpClientBuilder.create().setMaxConnPerRoute(maxConnections)
                .setMaxConnTotal(maxConnections).setDefaultRequestConfig(requestConfig);

        this.setHttpClientBuilder(mpHttpClientBuilder);
    }

    @Override
    public MpSPARQLProtocolSession createSPARQLProtocolSession(String queryEndpointUrl, String updateEndpointUrl) {
        MpSPARQLProtocolSession session = new MpSPARQLProtocolSession(getHttpClient(), executor);
        session.setQueryURL(queryEndpointUrl);
        session.setUpdateURL(updateEndpointUrl);
        return session;
    }
}
