package org.researchspace.x3ml;

import java.io.InputStream;

public class TestCase {
    private InputStream inputXml;
    private InputStream expectedRdf;
    private TestCaseConfig config;

    // Constructor
    public TestCase(InputStream inputXml, InputStream expectedRdf, TestCaseConfig config) {
        this.inputXml = inputXml;
        this.expectedRdf = expectedRdf;
        this.config = config;
    }

    // Getters and setters
    public InputStream getInputXml() {
        return inputXml;
    }

    public void setInputXml(InputStream inputXml) {
        this.inputXml = inputXml;
    }

    public InputStream getExpectedRdf() {
        return expectedRdf;
    }

    public void setExpectedRdf(InputStream expectedRdf) {
        this.expectedRdf = expectedRdf;
    }

    public TestCaseConfig getConfig() {
        return config;
    }

    public void setConfig(TestCaseConfig config) {
        this.config = config;
    }
}