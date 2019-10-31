import sbt._

object Dependencies {
  lazy val scalaTest = "org.scalatest" %% "scalatest" % "3.0.5"
  lazy val gatling = Seq(
    "io.gatling" % "gatling-test-framework" % "2.3.0" % Test,
    "io.gatling.highcharts" % "gatling-charts-highcharts" % "2.3.0" % Test,
    "org.yaml" % "snakeyaml" % "1.21" % Test
  )
}
