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

package com.metaphacts.security;

import java.util.Set;

/**
 * @author Denis Ostapenko
 */
public class UserMetadata {
    public static class GroupProps {
        public String dn;
        public String cn;
        public GroupProps(String dn, String cn) {
            this.dn = dn;
            this.cn = cn;
        }
    }
    public String name;
    public Set<GroupProps> groups;
    public Set<String> roles;
    public UserMetadata(String name, Set<GroupProps> groups, Set<String> roles) {
        this.name = name;
        this.groups = groups;
        this.roles = roles;
    }
}
