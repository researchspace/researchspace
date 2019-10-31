package org.researchspace.load


import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import collection.JavaConverters._
import scala.io.Source
import org.yaml.snakeyaml.Yaml

object Parameters {
 //val ENDPOINT =  "http://neptunedbcluster-uzo7hvakj8x6.cluster-cx7v9vfrmwjg.us-east-1.neptune.amazonaws.com:8182";
 //val ENDPOINT = "http://ec2-18-233-200-201.compute-1.amazonaws.com";  
 //val ENDPOINT = "https://development.researchspace.org";
  val ENDPOINT = "https://development-blazegraph.researchspace.org/blazegraph";
  
}

object Commons {
  val httpConf = http
    .baseURL(Parameters.ENDPOINT)
    .acceptEncodingHeader("gzip, deflate")
    //.inferHtmlResources()
    .userAgentHeader("Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0")
    
  val sparqlHeaders =
    Map(
      HttpHeaderNames.ContentType -> "application/sparql-query; charset=utf-8",
      HttpHeaderNames.Accept -> "application/sparql-results+json"
    )
  def sparqlQuery(name: String, query: String) = {
     http(name)
          .post("/sparql")
          .headers(sparqlHeaders)
          .body(StringBody(query))
          .check(status.is(200))
   }
   
  val jsonHeaders =
    Map(
      HttpHeaderNames.ContentType -> "application/json",
      HttpHeaderNames.Accept -> "application/json"
    )    
  def label(resource: String) = {
     http("get label")
       .post("/rest/data/rdf/utils/getLabelsForRdfValue")
       .headers(jsonHeaders)
       .queryParam("repository", "default")
       .body(StringBody(s"""["$resource"]""")).asJSON
       .check(status.is(200))
  }
  
  def thumbnail(resource: String) = {
     http("get thumbnail")
       .post("/rest/data/rdf/utils/thumbnails/default")
       .headers(jsonHeaders)
       .queryParam("repository", "default")
       .body(StringBody(s"""["$resource"]""")).asJSON
       .check(status.is(200))
  }
  
  def getYamlSource(name: String): IndexedSeq[Map[String, String]] = {
    val file = Source.fromResource(name).bufferedReader()
    val yaml = new Yaml();
    yaml
      .load(file).asInstanceOf[java.util.List[java.util.Map[String, String]]]
      .asScala.map(m => m.asScala.toMap).toIndexedSeq;
  }
  
  def getRelationsProfile(name: String): Map[String, List[String]] = {
    val file = Source.fromResource(name).bufferedReader()
    val yaml = new Yaml();
    yaml
      .load(file).asInstanceOf[java.util.Map[String, java.util.List[String]]]
      .asScala.mapValues(l => l.asScala.toList).toMap    
  }
}

object Browse { 
  import Commons._
  
  val resources = csv("resources.csv").random 
  
  val browse = 
    feed(resources).exec(
      http("browse pages")
        .get("/resource")
        .queryParam("uri", "${resource}")
        .resources(
          // fetch types
          sparqlQuery(
            "types", 
            """
              PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
              SELECT DISTINCT ?type WHERE { <${resource}> rdf:type ?type. }
            """
          ),
          
          // fetch description
          sparqlQuery(
            "description", 
            """
              PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
              SELECT ?description WHERE { <${resource}> rdfs:comment ?description. }
              LIMIT 1
            """
          ),
          
          // fetch label
          label("${resource}"),
          
          // fetch thumbnail
          thumbnail("${resource}"),
          
          // fetch incoming statements
          sparqlQuery(
            "incoming statements", 
            """
              SELECT ?property ?object ?graph WHERE { GRAPH ?graph { <${resource}> ?property ?object. } } LIMIT 1000
            """
          ),
          
          // fetch outgoing statements
          sparqlQuery(
            "outgoing statements", 
            """
              SELECT ?property ?subject ?graph WHERE { GRAPH ?graph { ?subject ?property <${resource}>. } } LIMIT 1000
            """
          ),          
        )
        .check(status.is(200))
    )
}

object SearchBenchmark {
  import Commons._
  
  val searches = getYamlSource("queries.yml")
  
  val benchmarks =
    repeat(searches.length, "i") {
      exec { session =>
          val i = session("i").as[Int]
          session.setAll(searches(i))
      }
      .exec(
        repeat(10) {
          exec(
            sparqlQuery("COUNT:${name}", "${prefixes} \n SELECT (COUNT(*) as ?count) WHERE { ${query} }")   
              .check(substring("${expectedCount}"))
          )
        },
        repeat(10) {
          exec(
            sparqlQuery("SEARCH_BASE:${name}", "${prefixes} \n ${query}")   
          )
        },
        repeat(10) {
          exec(
            sparqlQuery(
              "SEARCH_RESULT:${name}", 
              """
                ${prefixes}
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX cr: <http://www.cidoc-crm.org/cidoc-crm/>
                PREFIX rs: <http://www.researchspace.org/ontology/>
                SELECT DISTINCT ?subject ?iri WHERE {
                  { ${query} }
                  FILTER(EXISTS { ?subject (rdfs:label|rs:displayLabel) ?label. })
                  OPTIONAL { ?subject (rs:PX_has_main_representation|cr:P138i_has_representation) ?image. }
                  BIND(?subject AS ?iri)
                }
                ORDER BY DESC(?image)
                LIMIT 50000
              """
            )   
          )
        }
      )
  }
  
  val search =
    feed(searches)
      .exec(
        http("search page")
          .get("/resource/rsp:Search")
          .resources(
            // get search result counts
            sparqlQuery("COUNT:${name}", "${prefixes} \n SELECT (COUNT(*) as ?count) WHERE { { ${query} } }")
              .check(substring("${expectedCount}")),
              
            // get search results
            sparqlQuery("SEARCH:${name}", "${prefixes} \n ${query}")  
          )
      )
}


object SparqlBenchmark {
  import Commons._
  
  val queries = getYamlSource("queries.yml") 
  
  val benchmarks =
    repeat(queries.length, "i") {
      exec { session =>
          val i = session("i").as[Int]
          session.setAll(queries(i))
      }
      .exec(
        repeat(10) {
          exec(
            sparqlQuery("SEARCH:${name}", "${prefixes} \n ${query}")   
          )
        },
        
        repeat(10) {
          exec(
            sparqlQuery("COUNT:${name}", "${prefixes} \n SELECT (COUNT(*) as ?count) WHERE { { ${query} } }")   
              .check(substring("${expectedCount}"))
          )
        }
      )
  }
}

class PerformanceBenchmark extends Simulation {
  val users = scenario("benchmarking").exec(SparqlBenchmark.benchmarks);
  setUp(
    users.inject(atOnceUsers(1))
  ).protocols(Commons.httpConf)      
}


/*
class EndpointLoadSimulation extends Simulation {
  val users = scenario("browsing simulation").exec(Browse.browse);
  setUp(
    users.inject(rampUsers(10) over (180 seconds))
  ).protocols(Commons.httpConf)      
}
*/

