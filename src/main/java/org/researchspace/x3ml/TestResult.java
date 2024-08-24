package org.researchspace.x3ml;

import java.util.Objects;

public class TestResult {
    private String testId;
    private boolean success;
    private String x3mlErrors;
    private String exceptions;
    private Diff diff;

    public TestResult(boolean success, String testId) {
        this.success = success;
        this.testId = testId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getTestId() {
        return testId;
    }

    public Diff getDiff() {
        return diff;
    }

    public void setDiff(String addedRdf, String removedRdf) {
        this.diff = new Diff();
        this.diff.setAddedRdf(addedRdf);
        this.diff.setRemovedRdf(removedRdf);
    }

    public String getX3mlErrors() {
        return x3mlErrors;
    }

    public void setX3mlErrors(String x3mlErrors) {
        this.x3mlErrors = x3mlErrors;
    }

    public String getExceptions() {
        return exceptions;
    }

    public void setExceptions(String exceptions) {
        this.exceptions = exceptions;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Test: ").append(testId).append("\n");
        sb.append("Success: ").append(success).append("\n");

        if (!success) {
            sb.append("Diff:\n");
            sb.append(diff.toString());
        }

        return sb.toString();
    }

    public static class Diff {
        private String addedRdf;
        private String removedRdf;

        public String getAddedRdf() {
            return addedRdf;
        }

        public void setAddedRdf(String addedRdf) {
            this.addedRdf = addedRdf;
        }

        public String getRemovedRdf() {
            return removedRdf;
        }

        public void setRemovedRdf(String removedRdf) {
            this.removedRdf = removedRdf;
        }

        @Override
        public String toString() {
            StringBuilder sb = new StringBuilder();
            if (!Objects.isNull(addedRdf) && !addedRdf.isEmpty()) {
                sb.append("  Added RDF (TTL format):\n");
                sb.append(formatRdf(addedRdf));
            }
            if (!Objects.isNull(removedRdf) && !removedRdf.isEmpty()) {
                sb.append("  Removed RDF (TTL format):\n");
                sb.append(formatRdf(removedRdf));
            }
            return sb.toString();
        }

        private String formatRdf(String rdf) {
            String[] lines = rdf.split("\n");
            StringBuilder formatted = new StringBuilder();
            for (String line : lines) {
                formatted.append("    ").append(line).append("\n");
            }
            return formatted.toString();
        }
    }
}
