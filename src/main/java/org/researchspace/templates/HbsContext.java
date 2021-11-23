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

import java.util.Optional;

import javax.annotation.Nullable;

import com.github.jknack.handlebars.Context;

/**
 * Carries all the information and references to services required for compiling
 * a handlebars template for a particular resource.
 */
public class HbsContext {

    @Nullable
    private String preferredLanguage;

    private String deploymentTitle;

    public HbsContext(@Nullable String preferredLanguage, String deploymentTitle) {
        this.preferredLanguage = preferredLanguage;
        this.deploymentTitle = deploymentTitle;
    }

    public Optional<String> getPreferredLanguage() {
        return Optional.ofNullable(preferredLanguage);
    }

    public String getDeploymentTitle() {
        return deploymentTitle;
    }

    public static HbsContext fromHandlebars(Context handlebarsContext) {
        Object rootModel = handlebarsContext.data("root");
        if (!(rootModel instanceof HbsContext)) {
            throw new IllegalStateException("Unexpected root Handlebars context is not a HbsContext instance");
        }
        return (HbsContext) rootModel;
    }
}