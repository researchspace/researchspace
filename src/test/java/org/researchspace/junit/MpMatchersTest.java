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

import static org.junit.Assert.assertThat;
import static org.researchspace.junit.MpMatchers.hasItemsInOrder;

import java.util.List;

import static org.hamcrest.Matchers.not;

import org.junit.Test;

import com.google.common.collect.Lists;

/**
 * @author Andriy Nikolov <an@metaphacts.com>
 */
public class MpMatchersTest {

    public MpMatchersTest() {
    }

    @Test
    public void testHasItemsInOrder() {
        List<String> testList = Lists.newArrayList("first", "second", "third");
        assertThat(testList, hasItemsInOrder("first", "second", "third"));
        assertThat(testList, hasItemsInOrder("first", "second"));
        assertThat(testList, hasItemsInOrder("second", "third"));
        assertThat(testList, hasItemsInOrder("first", "third"));
        assertThat(testList, not(hasItemsInOrder("first", "third", "second")));
        assertThat(testList, not(hasItemsInOrder("third", "second")));
        assertThat(testList, not(hasItemsInOrder("third", "first")));
        assertThat(testList, not(hasItemsInOrder("second", "first")));
        assertThat(testList, not(hasItemsInOrder("fourth", "first")));
        assertThat(testList, not(hasItemsInOrder("first", "fourth")));
    }

}