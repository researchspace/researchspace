import RootBuildOptions._

name := "researchspace"
organization := "org.researchspace"
version := platformVersion

homepage := Some(url("http://www.researchspace.org"))
startYear := Some(2010)
description := "Creating the Cultural Heritage Knowledge Graph."

licenses += "LGPL 2.1" -> url("http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html")

libraryDependencies ++= Seq(
  // TwelveMonkeys ImageIO plugin to handle tiff files
  "com.twelvemonkeys.imageio" % "imageio-tiff" % "3.2.1",
  "com.twelvemonkeys.imageio" % "imageio-core" % "3.2.1"
)
