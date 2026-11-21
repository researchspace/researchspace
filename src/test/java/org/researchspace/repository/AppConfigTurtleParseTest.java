/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
package org.researchspace.repository;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.Rio;
import org.junit.Test;

/**
 * Every shipped repository/service/template Turtle file must parse the way the
 * platform parses it (rdf4j Rio with its default pre-seeded namespaces).
 * Broken config files fail silently at runtime — the repository or service
 * simply never appears — so syntax rot is caught here instead. (Two shipped
 * fixtures had been carrying stray-dot syntax errors unnoticed before this
 * test existed.)
 */
public class AppConfigTurtleParseTest {

    private static final String CONFIG_ROOT = "src/main/resources/org/researchspace/apps/default/config";

    @Test
    public void allShippedConfigTurtleFilesParse() throws IOException {
        Path root = Paths.get(CONFIG_ROOT);
        assertTrue("config root must exist: " + root.toAbsolutePath(), Files.isDirectory(root));

        List<String> failures = new ArrayList<>();
        int parsed = 0;
        try (Stream<Path> files = Files.walk(root)) {
            for (Path file : (Iterable<Path>) files.filter(p -> p.toString().endsWith(".ttl"))::iterator) {
                try (InputStream in = Files.newInputStream(file)) {
                    Rio.parse(in, "", RDFFormat.TURTLE);
                    parsed++;
                } catch (Exception e) {
                    failures.add(root.relativize(file) + ": " + e.getMessage());
                }
            }
        }

        assertTrue("expected to find shipped config files", parsed + failures.size() > 0);
        if (!failures.isEmpty()) {
            fail("Shipped config Turtle files failed to parse:\n  " + String.join("\n  ", failures));
        }
    }
}
