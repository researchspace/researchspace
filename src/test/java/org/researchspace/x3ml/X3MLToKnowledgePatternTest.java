package org.researchspace.x3ml;

import java.io.FileWriter;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.Test;
import org.researchspace.services.x3ml.X3MLToKnowledgePattern;
import org.researchspace.services.x3ml.X3MLToSPARQL.LinkInfo;
import org.w3c.dom.Document;

public class X3MLToKnowledgePatternTest {
    
    @Test
    public void generateTextPatterns() throws Exception {
        InputStream mappings = getClass().getClassLoader()
                .getResourceAsStream("org/researchspace/x3ml/patternsGeneration/midas.x3ml");
        Document mappingsDoc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(mappings);

        X3MLToKnowledgePattern x3mlToKnowledgePattern = new X3MLToKnowledgePattern();
        List<LinkInfo> links = x3mlToKnowledgePattern.generateTextKnowledgePatterns(mappingsDoc);
        links.forEach(System.out::println);
    }

    @Test
    public void generateAndSaveTextPatterns() throws Exception {
        // Specify the output folder
        String outputFolderPath = "/home/artem/new-work/projects/pharos/github/ETL-POC/etl/datasets/midas-pharos/queries/text-index";
        
        InputStream mappings = getClass().getClassLoader()
                .getResourceAsStream("org/researchspace/x3ml/patternsGeneration/midas.x3ml");
        Document mappingsDoc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(mappings);

        X3MLToKnowledgePattern x3mlToKnowledgePattern = new X3MLToKnowledgePattern();
        List<LinkInfo> links = x3mlToKnowledgePattern.generateTextKnowledgePatterns(mappingsDoc);

        Files.createDirectories(Paths.get(outputFolderPath));
        for (LinkInfo link : links) {
            if (link.linkId.isPresent() && link.domain.equals("http://www.cidoc-crm.org/cidoc-crm/E22_Human-Made_Object")) {
                String fileName = link.linkId.get() + ".sparql";
                Path filePath = Paths.get(outputFolderPath, fileName);
                
                try (FileWriter writer = new FileWriter(filePath.toFile())) {
                    writer.write(link.query);
                }
                
                System.out.println("Saved file: " + filePath);
            }
        }
    }
}
