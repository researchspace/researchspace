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

package org.researchspace.junit;

import java.util.List;
import java.util.Arrays;
import java.util.Iterator;

import org.hamcrest.BaseMatcher;
import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.Matchers;

/**
 * Implementations of custom {@link Matcher}s for tests.
 * 
 * @author Andriy Nikolov <an@metaphacts.com>
 *
 */
public class MpMatchers {

    private MpMatchers() {
    }

    /**
     * Checks whether the list includes all elements of items in the provided order:
     * i.e.:
     * <ul>
     * <li>The checked list List1 must contain elements of {@code items}</li>
     * <li>if A precedes B in {@items}, then must A precede B in List1 too</li>
     * </ul>
     * Differs from the standard {@link Matchers#contains(Object...)} in two
     * aspects:
     * <ul>
     * <li>The checked list List1 may contain other elements besides the elements of
     * {@code items}.</li>
     * <li>Any two elements of {@code items} in the checked list List1 can be
     * separated by other elements. (i.e., List1 may contain other elements between
     * A and B that are not contained in {@code items})</li>
     * </ul>
     */
    public static Matcher<List<? extends Object>> hasItemsInOrder(final Object... items) {
        return new BaseMatcher<List<? extends Object>>() {

            String cause = "";

            @Override
            public boolean matches(Object item) {
                List<? extends Object> main = (List<? extends Object>) item;

                Iterator<Object> iter = Arrays.asList(items).iterator();
                Object prevItem = iter.next();
                int prevIndex = main.indexOf(prevItem);
                while (iter.hasNext()) {
                    if (prevIndex == -1) {
                        cause = "Item [" + prevItem + "] not in the list";
                        return false;
                    }
                    Object curItem = iter.next();
                    int curIndex = main.indexOf(curItem);
                    if (prevIndex > curIndex) {
                        cause = (curIndex == -1) ? "Item [" + curItem + "] not in the list"
                                : "Item [" + curItem + "] is found before [" + prevItem + "]";
                        return false;
                    }
                    prevIndex = curIndex;
                }

                return true;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText(cause);
            }

        };
    }
}