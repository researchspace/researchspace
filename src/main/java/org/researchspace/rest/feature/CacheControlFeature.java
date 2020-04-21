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

package org.researchspace.rest.feature;

import java.io.IOException;
import java.lang.annotation.Annotation;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerResponseContext;
import javax.ws.rs.container.ContainerResponseFilter;
import javax.ws.rs.container.DynamicFeature;
import javax.ws.rs.container.ResourceInfo;
import javax.ws.rs.core.FeatureContext;
import javax.ws.rs.core.HttpHeaders;

import org.researchspace.rest.feature.CacheControl.Cache;
import org.researchspace.rest.feature.CacheControl.MaxAgeCache;
import org.researchspace.rest.feature.CacheControl.NoCache;

/**
 * {@link DynamicFeature} to register {@link CacheControlResponseFilter}s for
 * all jersey methods (or methods of classes) being annotated with
 * {@link CacheControl} annotations at configuration time.
 * 
 * @author Johannes Trame <jt@metaphacts.com>
 */
public class CacheControlFeature implements DynamicFeature {

    private static List<Class<? extends Annotation>> cacheAnnotations = Collections
            .unmodifiableList(Arrays.asList(Cache.class, MaxAgeCache.class, NoCache.class));

    @Override
    public void configure(ResourceInfo resourceInfo, FeatureContext context) {

        String cacheControlHeaderValue = null;
        for (Class<? extends Annotation> annotationClass : cacheAnnotations) {
            Annotation classCacheAnnotation = resourceInfo.getResourceClass().getAnnotation(annotationClass);
            Annotation methodCacheAnnotation = resourceInfo.getResourceMethod().getAnnotation(annotationClass);

            // method annotations overwrite class annotations
            // as soon as one is found, return i.e. even if several cache annotations used
            // we can't
            // consider any order
            if (methodCacheAnnotation != null) {
                cacheControlHeaderValue = getCacheHeaderValue(methodCacheAnnotation);
                break;
            } else if (classCacheAnnotation != null) {
                cacheControlHeaderValue = getCacheHeaderValue(classCacheAnnotation);
                break;
            }
        }

        if (cacheControlHeaderValue != null) {
            context.register(new CacheControlResponseFilter(cacheControlHeaderValue));
        }

    }

    /**
     * Extracts the cache value from any {@link CacheControl} annotation.
     * 
     * @param annotation
     * @return Default: "max-age=0, no-cache, no-store, must-revalidate"
     */
    private String getCacheHeaderValue(Annotation annotation) {
        if (annotation.annotationType() == Cache.class) {
            return ((Cache) annotation).value();
        } else if (annotation.annotationType() == MaxAgeCache.class) {
            Long time = ((MaxAgeCache) annotation).time();
            TimeUnit unit = ((MaxAgeCache) annotation).unit();
            return "max-age=" + unit.toSeconds(time);
        }
        return "max-age=0, no-cache, no-store, must-revalidate";
    }

    /**
     * @author Johannes Trame <jt@metaphacts.com>
     */
    private class CacheControlResponseFilter implements ContainerResponseFilter {

        private final String cacheControlValue;

        CacheControlResponseFilter(String cacheControlValue) {
            this.cacheControlValue = cacheControlValue;
        }

        @Override
        public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext)
                throws IOException {
            responseContext.getHeaders().putSingle(HttpHeaders.CACHE_CONTROL, cacheControlValue);
        }

    }

}