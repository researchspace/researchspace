package org.researchspace.x3ml;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class TestCaseConfig {
    private String projectHrid;
    private String projectName;
    private String testId;
    private String description;
    private List<MappingItem> mapping;

    public String getProjectIdAndLinks() {
        String links = mapping.stream()
                .flatMap(item -> item.getLinks() != null ? item.getLinks().stream() : Stream.empty())
                .collect(Collectors.joining(","));
        return projectHrid + "|" + links;
    }

    public String getProjectHrid() {
        return projectHrid;
    }

    public void setProjectHrid(String projectId) {
        this.projectHrid = projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getTestId() {
        return testId;
    }

    public void setTestId(String testId) {
        this.testId = testId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<MappingItem> getMapping() {
        return mapping;
    }

    public void setMapping(List<MappingItem> mapping) {
        this.mapping = mapping;
    }

    public static class MappingItem {
        private String id;
        private List<String> links;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public List<String> getLinks() {
            return links;
        }

        public void setLinks(List<String> links) {
            this.links = links;
        }
    }
}
