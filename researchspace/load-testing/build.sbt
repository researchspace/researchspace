import Dependencies._

lazy val root = (project in file(".")).
  settings(
    inThisBuild(List(
      organization := "org.researchspace",
      scalaVersion := "2.12.6",
      version      := "0.1.0-SNAPSHOT"
    )),
    name := "load-testing",
    libraryDependencies += scalaTest % Test,
    libraryDependencies ++= gatling,
    resolvers += Resolver.sonatypeRepo("releases"),
    javaOptions in Gatling := overrideDefaultJavaOptions("-Xms1024m", "-Xmx4048m")
  ).
  enablePlugins(GatlingPlugin),
