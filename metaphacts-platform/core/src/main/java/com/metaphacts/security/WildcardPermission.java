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

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.shiro.authz.Permission;
import com.google.common.collect.Maps;
import com.google.common.collect.Lists;

/**
 * Override for the default {@link org.apache.shiro.authz.permission.WildcardPermission}
 * that 
 * <ul>
 *  <li>escapes ":" inside "<>", to make possible use of IRIs in SHIRO permission strings.
 *  E.g my:permission:&lt;http://example.com&gt;:edit</li>
 *  <li>supports arbitrary regex filters over permission string parts. 
 *  As of now, regex permissions have the format <code>regex(MY_REGULAR_EXPRESSION)</code> 
 *  and are only applicable to the final (instance) part of <code>pages:</code> 
 *  permission strings</li>
 * </ul>
 * 
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Andriy Nikolov an@metaphacts.com
 */
public class WildcardPermission extends org.apache.shiro.authz.permission.WildcardPermission {
    private static final long serialVersionUID = 1L;
    private static final Pattern iriEscapePattern = Pattern.compile("<(.*?):(.*?)>");
    private static final Pattern regexEscapePattern = Pattern.compile("regex\\(.*\\)$");
    
    protected Map<String, Pattern> regexPatterns;
    protected  String wildcardString;

    public WildcardPermission(String wildcardString) {
        this(wildcardString, DEFAULT_CASE_SENSITIVE);
        // store the original permission string so we can return it  
        // unchanged in toString(), e.g. to save it to a role definition
        this.wildcardString = wildcardString;
    }

    public WildcardPermission(String wildcardString, boolean caseSensitive) {
        super(wildcardString, caseSensitive);
        this.regexPatterns = Maps.newHashMap();
        initRegexParts(wildcardString);
    }
    
    @Override
    public String toString() {
        // return the unchanged original permission string
        return wildcardString;
    }

    @Override
    protected void setParts(String wildcardString, boolean caseSensitive) {
        if (wildcardString.contains("<") || wildcardString.contains("regex(")) {
            Map<String, String> escapedMap = Maps.newHashMap();
            // The permission string gets split by the colon character (":").
            // Thus, we need to escape within IRIs and regex patterns
            String escaped = escapePatternIfNeeded(regexEscapePattern, wildcardString, escapedMap, caseSensitive);
            escaped = escapePatternIfNeeded(iriEscapePattern, escaped, escapedMap, caseSensitive);
            // The permission string gets split into parts
            super.setParts(escaped, caseSensitive);
            // Now we replace back the escaped parts with unescaped ones
            List<Set<String>> unescapedParts = unescapeParts(this.getParts(), escapedMap);
            super.setParts(unescapedParts);
        } else {
            super.setParts(wildcardString, caseSensitive);
        }
    }
    
    protected String escapePatternIfNeeded(Pattern pattern, String wildcardString,
            Map<String, String> escapedMap, boolean caseSensitive) {
        Matcher matcher = pattern.matcher(wildcardString);
        StringBuffer buffer = new StringBuffer();
        String group;
        String replacement;
        while (matcher.find()) {
            group = matcher.group();
            replacement = group.replaceAll(":", ";");
            if (!caseSensitive) {
                replacement = replacement.toLowerCase();
            }
            escapedMap.put(replacement, group);
            matcher.appendReplacement(buffer, replacement);
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }
    
    /**
     * Unescape the permission string parts which were previously escaped. 
     * 
     * @param escapedParts
     * @param escapedMap
     * @return
     */
    protected List<Set<String>> unescapeParts(List<Set<String>> escapedParts, Map<String, String> escapedMap) {
        // We sort the map keys by length in the decreasing order to avoid possible 
        // corruption (e.g., if "<urn;myurn>" gets replaced before "regex(<urn;myurn>|<urn;otherurn>)", 
        // corrupts the original string and leads to the "regex(...)" pattern not being unescaped properly).
        List<String> keyList = Lists.newArrayList(escapedMap.keySet());
        keyList.sort((s1, s2) -> {
            return s1.length() > s2.length() ? -1 : (s1.length() == s2.length()) ? 0 : 1;
        });
        return escapedParts.stream()
                .map(sets -> sets.stream()
                        .map(p -> {
                            String unescapedPart = p;
                            for (String key : keyList) {
                                unescapedPart = unescapedPart.replace(key, escapedMap.get(key));
                            }
                            return unescapedPart;
                        })
                        .collect(Collectors.toSet())
                )
                .collect(Collectors.toList());
    }
    
    /**
     * We select the regex patterns defined in the permission string, 
     * compile them immediately and store to avoid 
     * expensive regex pattern compiling during the permission check time.
     *  
     * @param wildcardString
     */
    protected void initRegexParts(String wildcardString) {
        regexPatterns.clear();
        if (wildcardString.contains("regex(")) {
            List<Set<String>> parts = getParts();
            Set<String> lastPart = parts.get(parts.size() - 1);
            lastPart.stream().forEach( part -> compileRegexPartIfNeeded(part));
        }
    }
    
    /**
     * If <code>part</code> represents a regex pattern, compile and store it.
     * @param part
     */
    protected void compileRegexPartIfNeeded(String part) {
        if (part.startsWith("regex(") && part.endsWith(")")) {
            String regex = part.substring(6, part.length() - 1);
            Pattern pattern = Pattern.compile(regex);
            regexPatterns.put(part, pattern);
        }
    }

    protected List<Set<String>> getParts() {
        return super.getParts();
    }

    @Override
    public boolean implies(Permission p) {
        List<Set<String>> parts = getParts();
        Set<String> domainParts = parts.get(0);
        boolean isTemplatePermission = domainParts.contains(Permissions.PAGES.DOMAIN);
        if (isTemplatePermission && !regexPatterns.isEmpty()) {
            return impliesWithRegex(p);
        } else {
            return super.implies(p);
        }
    }
    
    protected boolean impliesWithRegex(Permission p) {
     // By default only supports comparisons with other WildcardPermissions
        if (!(p instanceof WildcardPermission)) {
            return false;
        }

        WildcardPermission wp = (WildcardPermission) p;

        List<Set<String>> otherParts = wp.getParts();

        int i = 0;
        for (Set<String> otherPart : otherParts) {
            // If this permission has less parts than the other permission, everything after the number of parts contained
            // in this permission is automatically implied, so return true
            if (getParts().size() - 1 < i) {
                return true;
            } else {
                Set<String> part = getParts().get(i);
                // NOTE: This is the only change with respect to the superclass
                // Instead of checking for equivalence, we take potential regex
                // filter into account
                if (!part.contains(WILDCARD_TOKEN) && !matchesAll(part, otherPart)) {
                    return false;
                }
                i++;
            }
        }

        // If this permission has more parts than the other parts, only imply it if all of the other parts are wildcards
        for (; i < getParts().size(); i++) {
            Set<String> part = getParts().get(i);
            if (!part.contains(WILDCARD_TOKEN)) {
                return false;
            }
        }

        return true;
    }
    
    protected boolean matchesAll(Set<String> mySubparts, Set<String> otherSubparts) {
        for (String otherSubpart : otherSubparts) {
            if (!matchesOther(mySubparts, otherSubpart)) {
                return false;
            }
        }
        return true;
    }
    
    protected boolean matchesOther(Set<String> mySubparts, String other) {
        for (String mine : mySubparts) {
            if (partMatches(mine, other)) {
                return true;
            }
        }
        return false;
    }
    
    protected boolean partMatches(String mine, String other) {
        if (other.equals(mine)) {
            return true;
        }
        if (this.regexPatterns.containsKey(mine)) {
            Pattern pattern = this.regexPatterns.get(mine);
            return pattern.matcher(other).matches();
        }
        return false;
    }
    
    
}
