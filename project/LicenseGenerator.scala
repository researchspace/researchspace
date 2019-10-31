/*!
 * Copyright (C) 2015-2018, metaphacts GmbH
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
package com.metaphacts

import java.io.BufferedReader
import java.io.DataInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStreamReader
import java.text.DateFormat
import java.text.SimpleDateFormat
import java.util.ArrayList
import java.util.Date
import java.util.List
import java.util.Map
import java.util.Set
import java.util.TreeMap
import java.util.TreeSet
import java.util.Collections
import scala.collection.JavaConversions._
import scala.io.Source

object LicenseAggregator {

  val ERR_MSG_CHECKSUMS_DIFFER = "Checksums differ -> something is likely to be wrong"

  val ERR_MSG_UNKNOWN_LICENSES = "One or more unknown license(s)"

  val PLACEHOLDER_UNKNOWN_LICENSE_NAME = "Unknown License"

  val PLACEHOLDER_UNKNOWN_LICENSE_LINK = "_UNKNOWN_LINK_"

  // DO NOT use this generally, i.e. only in well-informed cases
  val NO_EXPLICIT_LICENSE_LINK = "_NO_EXPLICIT_LICENSE_LINK_"

  val HIGHCHARTS_OEM_LICENSE = "Highcharts OEM License, version 5.0"
  val HIGHCHARTS_OEM_LICENSE_LINK = "https://shop.highsoft.com/media/highsoft/Standard-License-Agreement-7.0.pdf"

  val SPUTNIQ_LICENSE = "Sputniq Reseller License"
  val SPUTNIQ_LICENSE_LINK = "https://metaphacts.com/images/sputniq_license.txt"

  val MIT_LICENSE_LINK = "http://opensource.org/licenses/mit-license.php"

  val ZLIB_LICENSE_LINK = "https://spdx.org/licenses/Zlib"

  val LGPL_2_1_LICENSE_LINK = "https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html"

  val LGPL_LICENSE_LINK = "http://www.gnu.de/documents/lgpl-3.0.en.html"

  val APACHE2_LICENSE_LINK = "http://www.apache.org/licenses/LICENSE-2.0.txt"

  val ISC_LICENSE_LINK = "http://opensource.org/licenses/ISC"

  val BSD_2_LICENSE_LINK = "http://opensource.org/licenses/BSD-2-Clause"

  val WTFPL_LICENSE_LINK = "http://www.wtfpl.net/txt/copying/"

  val MPL_2_LICENSE_LINK = "http://opensource.org/licenses/MPL-2.0"
  
  /**
   * Statically defined licensed (incorporated directly)
   */
  private def gatherStaticLibraries(lics: List[ThirdPartyLibInfo]): Int = {

    // see folder /src/main/app/js
    val licLAB =
      new ThirdPartyLibInfo("LAB", "LAB", "v2.0.3", "MIT", "http://opensource.org/licenses/MIT")

    // /src/main/widget/map-widget
    val licOpenLayers3Popup =
      new ThirdPartyLibInfo("ol3", "ol3-popup", " v3.1.1", "BSD-style", "https://raw.githubusercontent.com/openlayers/ol3/master/LICENSE.md")

    // see folder /src/main/widget/timeline-widget
    val licSimileTimeline =
      new ThirdPartyLibInfo("timeline", "simile timeline", "2.3.0", "BSD", "http://directory.fsf.org/wiki/License:BSD_3Clause")

    lics.add(licLAB)
    lics.add(licOpenLayers3Popup)
    lics.add(licSimileTimeline)

    lics.size()
  }


  private def gatherCoreLibraries(licenseFileCore: String, lics: List[ThirdPartyLibInfo], strictMode: Boolean, skipGroup: String, includeFromLibraries: Set[String]): Int = {
    val lines:scala.collection.immutable.List[String] = readFile(licenseFileCore)

    var last: ThirdPartyLibInfo = null
    var coreCtr = 0
    for (i <- 4 until lines.size) {
      val line = lines.get(i)
      val components = line.split("\\|")

      if (components.length > 3) {

        val licenseInfo = components(1).trim()
        val startIdxLN = licenseInfo.indexOf("[") + 1
        val endIdxLN = licenseInfo.indexOf("]")
        val licenseName = licenseInfo.substring(startIdxLN, endIdxLN)
        val startIdxLL = licenseInfo.lastIndexOf("(") + 1
        val endIdxLL = licenseInfo.lastIndexOf(")")
        val licenseLink = licenseInfo.substring(startIdxLL, endIdxLL)
        val libraryInfo = components(2).trim()
        val libraryInfoComponents = libraryInfo.split("#")
        val libraryInfoBase = libraryInfoComponents(0).trim()
        val libraryInfoSubpackage = libraryInfoComponents(1).trim()
        val libraryInfoVersion = libraryInfoComponents(2).trim()
        val cur = new ThirdPartyLibInfo(libraryInfoBase, libraryInfoSubpackage, libraryInfoVersion, licenseName,
          licenseLink)
        if (last != null && last.libraryName == cur.libraryName &&
          last.licenseName == cur.licenseName &&
          last.licenseLink == cur.licenseLink) {
          last.appendSubPackageInfo(cur.librarySubpackage)
        } else {
          if (
            (includeFromLibraries.contains("metaphacts-platform"))
            || (!cur.libraryName.contains("metaphacts") && !cur.libraryName.contains("graphscope"))) {
            lics.add(cur)
          }

          last = cur
        }
        coreCtr += 1
      }
    }
    coreCtr
  }

  private def gatherWebLibraries(licenseFileWeb: String, lics: List[ThirdPartyLibInfo], strictMode: Boolean): Int = {
    val lines = readFile(licenseFileWeb)
    val firstLine = lines.get(4)
    val offs = new ArrayList[Integer]()
    offs.add(firstLine.indexOf("department"))
    offs.add(firstLine.indexOf("related to"))
    offs.add(firstLine.indexOf("name"))
    offs.add(firstLine.indexOf("license period"))
    offs.add(firstLine.indexOf("material / not material"))
    offs.add(firstLine.indexOf("license type"))
    offs.add(firstLine.indexOf("link"))
    offs.add(firstLine.indexOf("comment"))
    offs.add(firstLine.length)
    var webCtr = 0
    for (i <- 6 until lines.size) {
      val cur = lines.get(i)
      if(!cur.isEmpty() && !cur.startsWith(">")) {
        val libraryName = webLibraryStringByOffset(cur, offs, 2, 3)
        var licenseName = webLibraryStringByOffset(cur, offs, 5, 6)
        val libraryVersion = webLibraryStringByOffset(cur, offs, 7, -1)
        var licenseLink: String = null
        if (licenseName == "MIT" || licenseName == "MIT, GPL" || licenseName == "OFL-1.1, MIT" || licenseName == "OFL-1.1 AND MIT" || licenseName == "(OFL-1.1 AND MIT)") {
          licenseName = "MIT"
          licenseLink = MIT_LICENSE_LINK
        } else if (licenseName == "BSD" || licenseName == "BSD-3-Clause") {
          licenseName = "BSD"
          licenseLink = "http://directory.fsf.org/wiki/License:BSD_3Clause"
        } else if (licenseName == "ISC") {
          licenseName = "ISC"
          licenseLink = ISC_LICENSE_LINK
        } else if (licenseName == "Apache 2.0" || licenseName == "Apache v2" ||
          licenseName == "Apache License 2.0" || licenseName == "Apache-2.0" || licenseName == "Apache" ||
          licenseName == "(Apache-2.0 OR MIT)") {
          licenseName = "Apache License 2.0"
          licenseLink = APACHE2_LICENSE_LINK
        } else if (licenseName == "LGPL-2.1") {
          licenseName = "LGPL 2.1"
          licenseLink = LGPL_2_1_LICENSE_LINK
        } else if (licenseName == "LGPL-3.0+") {
          licenseName = "LGPL 3.0+"
          licenseLink = LGPL_LICENSE_LINK
        } else if (licenseName == "LGPL3+") {
          licenseName = "LGPL 3.0+"
          licenseLink = LGPL_LICENSE_LINK
        }else if (licenseName == "GNU Lesser General Public License v3.0") {
          licenseName = "GNU Lesser General Public License v3.0"
          licenseLink = LGPL_LICENSE_LINK
        } else if (licenseName == "BSD 2-Clause" || licenseName == "BSD 2 Clause" || licenseName == "BSD-2-Clause") {
          licenseName = "BSD 2 Clause"
          licenseLink = BSD_2_LICENSE_LINK
        } else if (licenseName == "zlib") {
          licenseName = "zlib License"
          licenseLink = ZLIB_LICENSE_LINK
        } else if (licenseName == "WTFPL") {
          licenseName = "WTFPL"
          licenseLink = WTFPL_LICENSE_LINK
        } else if (licenseName == "https://www.highcharts.com/license") {
          licenseName = HIGHCHARTS_OEM_LICENSE
          licenseLink = HIGHCHARTS_OEM_LICENSE_LINK
        } else if (licenseName == "https://sputniq.space/license") {
          licenseName = SPUTNIQ_LICENSE
          licenseLink = SPUTNIQ_LICENSE_LINK
        } else if (licenseName == "MPL-2.0") {
          licenseName = "MPL-2.0"
          licenseLink = MPL_2_LICENSE_LINK
        } else if (licenseName == "n/a") {
          if (libraryName == "typeahead.js" && libraryVersion == "0.10.5") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "sinon") {
            licenseName = "BSD"
            licenseLink = "http://directory.fsf.org/wiki/License:BSD_3Clause"
          } else if (libraryName == "sparqljs") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "basil.js") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "karma-junit-reporter") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "griddle-react") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "react-router") { //according to package.json 0.13.x
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "react-select") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "html-to-react") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "uuid") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "chart.js") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "rc-slider") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "react-chartjs-2") {
            licenseName = "MIT"
            licenseLink = MIT_LICENSE_LINK
          } else if (libraryName == "draft-js") {
            licenseName = "BSD"
            licenseLink = "https://raw.githubusercontent.com/facebook/draft-js/master/LICENSE"
          } else if (libraryName == "scriptjs") {
            licenseName = "MIT"
            licenseLink = "https://github.com/ded/script.js/blob/v2.5.8/src/header.js"
          } else if (libraryName == "draft-js-export-html") {
            licenseName = "ISC"
            licenseLink = ISC_LICENSE_LINK
          } else {
            throw new RuntimeException("Unknown unmapped n/a license for library: " + libraryName +
              ". Please provide mapping in script.")
          }
        } else {
          throw new RuntimeException("Unknown license: " + licenseName + " . Please fix script.")
        }
        lics.add(new ThirdPartyLibInfo(libraryName, null, libraryVersion, licenseName, licenseLink))
        webCtr += 1
      }
    }
    webCtr
  }

  private def webLibraryStringByOffset(line: String,
      offs: List[Integer],
      startOff: Int,
      endOff: Int): String = {
    if (endOff > startOff) line.substring(offs.get(startOff), offs.get(endOff))
      .trim()
      .replaceAll("\\\\$", "") else line.substring(offs.get(startOff)).trim().replaceAll("\\\\$", "")
  }

  private def readFile(file: String): scala.collection.immutable.List[String] = {
    Source.fromFile(file).getLines.toList
  }

  private def writeThirdPartyFile(licenseFileOut: String, groupedByLicense: Map[String, List[ThirdPartyLibInfo]], strictMode: Boolean):File ={
    val buf = new StringBuffer()
    buf.append(licenseFileHeader())
    val licenseSnippets = new TreeSet[String]()
    for (groupKey <- groupedByLicense.keySet) {
      val tmpBuf = new StringBuffer()
      val libsInGroup = groupedByLicense.get(groupKey)
      if (libsInGroup == null || libsInGroup.isEmpty) {
        throw new RuntimeException("Empty group, something's wrong here")
      }
      val licenseName = libsInGroup.get(0).licenseName
      val licenseLink = libsInGroup.get(0).licenseLink
      tmpBuf.append("    <h2>")
      tmpBuf.append(licenseName)
      tmpBuf.append("</h2>\n")
      if (licenseLink == PLACEHOLDER_UNKNOWN_LICENSE_LINK) {
        tmpBuf.append("<b><font color=\"red\">UNKOWN LICENSE</font></b>")
        var msg = ERR_MSG_UNKNOWN_LICENSES
        for (libInGroup <- libsInGroup) {
          msg += "\n- " + libInGroup
        }
        if (strictMode) {
          throw new RuntimeException(msg)
        } else {
          System.err.println(msg)
        }
      } else if (licenseLink == NO_EXPLICIT_LICENSE_LINK) {
        // NOTHING to append
      } else {
        tmpBuf.append("<i>Click ")
        tmpBuf.append("<a href=\"")
        tmpBuf.append(licenseLink)
        tmpBuf.append("\">")
        tmpBuf.append(licenseLink)
        tmpBuf.append("</a> to see full license.</i>")
      }
      tmpBuf.append("<br/><br/>\n")
      tmpBuf.append("<table border=\"1\"><tr><th>Library</th><th>Version</th><th>Subpackage(s)</th></tr>\n")
      for (i <- 0 until libsInGroup.size) {
        val cur = libsInGroup.get(i)
        tmpBuf.append("<tr>\n")
        tmpBuf.append("<td>")
        tmpBuf.append(cur.libraryName)
        tmpBuf.append("</td>\n")
        tmpBuf.append("<td>")
        if (cur.libraryVersion != null && !cur.libraryVersion.isEmpty) {
          tmpBuf.append(cur.libraryVersion)
        } else {
          tmpBuf.append("&nbsp;")
        }
        tmpBuf.append("</td>\n")
        tmpBuf.append("<td>")
        if (cur.librarySubpackage != null && !cur.librarySubpackage.isEmpty) {
          tmpBuf.append(cur.librarySubpackage)
        } else {
          tmpBuf.append("&nbsp;")
        }
        tmpBuf.append("</td>\n")
        tmpBuf.append("</tr>\n")
      }
      tmpBuf.append("</table>\n")
      licenseSnippets.add(tmpBuf.toString)
    }
    for (licenseSnippet <- licenseSnippets) {
      buf.append(licenseSnippet)
    }
    buf.append(licenseFileFooter())
    println("Writing license file " + licenseFileOut)
    var fo = new File(licenseFileOut)
    var fos: FileOutputStream = null
    try {
      fos = new FileOutputStream(fo)
      fos.write(buf.toString.getBytes)
    } finally {
      if (fos != null) {
        fos.close()
      }
    }
    println("All done.")
    fo
  }

  private def licenseFileHeader(): String = {
    val fileTitle = "Third Party Libraries"
    val buf = new StringBuffer()
    buf.append("<html>\n")
    buf.append("  <header>\n")
    buf.append("    <title>")
    buf.append(fileTitle)
    buf.append("</title>\n")
    buf.append("  </header>\n")
    buf.append("  <body>\n")
    buf.append("    <h1>")
    buf.append(fileTitle)
    buf.append("</h1>\n")
    buf.toString
  }

  private def licenseFileFooter(): String = {
    val dateFormat = new SimpleDateFormat("yyyy/MM/dd', 'HH:mm:ss z")
    val buf = new StringBuffer()
    buf.append("  <br/><br/><hr/>\n")
    buf.append("  <i>Third party file automatically generated at ")
    buf.append(dateFormat.format(new Date()))
    buf.append("</i>\n")
    buf.append("  </body>\n")
    buf.append("</html>")
    buf.toString
  }

  def doGenerate(licenseFilesWeb: ArrayList[String],
      licenseFileCore: String,
      licenseFileOut: String,
      strictMode: Boolean,
      skipGroup: String,
      includeFromLibraries: Set[String]
  ) :File ={
    val licsCore = new ArrayList[ThirdPartyLibInfo]()
    val coreCtr = gatherCoreLibraries(licenseFileCore, licsCore, strictMode, skipGroup, includeFromLibraries)
    println("Gathered " + coreCtr + " libs in core " + "(excluding subpackages: " +
      licsCore.size +
      ")...")

    val licsWeb = new ArrayList[ThirdPartyLibInfo]();
    var webCtr = 0;
    for (i <- 0 until licenseFilesWeb.size) {
      webCtr = webCtr + gatherWebLibraries(licenseFilesWeb(i), licsWeb, strictMode)
    }
    println("Gathered " + webCtr + " libs in core " + "(excluding subpackages: " +
      licsWeb.size +
      ")...")

    val licsStatic = new ArrayList[ThirdPartyLibInfo]()
    val staticCtr = gatherStaticLibraries(licsStatic)
    println("Gathered " + staticCtr + " static libs " + "(excluding subpackages: " +
      licsStatic.size + ")...")

    var libs = new ArrayList[ThirdPartyLibInfo]()
    libs.addAll(licsCore)
    libs.addAll(licsWeb)
    libs.addAll(licsStatic)
    Collections.sort(libs);

    println("-> " + (coreCtr + webCtr + staticCtr) + " including subpackages in overall.")
    println("-> " + libs.size + " excluding subpackages in overall.")
    println()
    var checksum1 = 0
    for (i <- 0 until libs.size) {
      checksum1 += libs.get(i).subPackageCounter
    }
    println("Checksum1 including subpackages: " + checksum1)
    for (i <- 0 until libs.size) {
      val cur = libs.get(i)
      if (cur.licenseLink != null) {
        if (cur.licenseLink == "http://www.apache.org/licenses/LICENSE-2.0" ||
          cur.licenseLink == "http://www.snmp4j.org/LICENSE-2_0.txt") {
          cur.licenseLink = "http://www.apache.org/licenses/LICENSE-2.0.txt"
          cur.licenseName = "Apache License 2.0"
        } else if (cur.licenseLink == "http://www.opensource.org/licenses/mit-license.php" ||
          (cur.licenseLink == "http://opensource.org/licenses/MIT")) {
          cur.licenseLink = "http://opensource.org/licenses/mit-license.php"
          cur.licenseName = "MIT"
        } else if (cur.licenseLink == "https://www.mozilla.org/MPL/2.0/" ||
          cur.licenseLink == "http://www.mozilla.org/MPL/2.0/index.txt") {
          cur.licenseLink = "https://www.mozilla.org/MPL/2.0/index.txt"
          cur.licenseName = "Mozilla Public License, Version 2.0"
        } else if (cur.licenseLink == "http://www.opensource.org/licenses/bsd-license.php" ||
          cur.licenseLink == "http://opensource.org/licenses/BSD-2-Clause") {
          cur.licenseLink = "http://opensource.org/licenses/bsd-license.php"
          cur.licenseName = "BSD 2 Clause"
        }else if (cur.licenseLink == "https://glassfish.java.net/public/CDDL+GPL_1_1.html") {
          cur.licenseName = "CDDL v1.1"
        }
      }
    }
    var checksum2 = 0
    for (i <- 0 until libs.size) {
      checksum2 += libs.get(i).subPackageCounter
    }
    println("Checksum2 including subpackages: " + checksum2)
    if (checksum1 != checksum2) {
      if (strictMode) {
        throw new RuntimeException(ERR_MSG_CHECKSUMS_DIFFER)
      } else {
        System.err.println(ERR_MSG_CHECKSUMS_DIFFER)
      }
    }
    val groupedByLicense = new TreeMap[String, List[ThirdPartyLibInfo]]()
    for (i <- 0 until libs.size) {
      val cur = libs.get(i)
      if (cur.licenseLink == null) {
        throw new RuntimeException("Undefined License for " + cur + ". Please fix!")
      }
      val groupId = cur.licenseLink
      if (!groupedByLicense.containsKey(groupId)) {
        groupedByLicense.put(groupId, new ArrayList[ThirdPartyLibInfo]())
      }
      groupedByLicense.get(groupId).add(cur)
    }
    var checksum3 = 0
    for (groupKey <- groupedByLicense.keySet) {
      val libsInGroup = groupedByLicense.get(groupKey)
      for (i <- 0 until libsInGroup.size) {
        checksum3 += libsInGroup.get(i).subPackageCounter
      }
    }
    println("Checksum3 including subpackages: " + checksum3)
    if (checksum2 != checksum3) {
      if (strictMode) {
        throw new RuntimeException(ERR_MSG_CHECKSUMS_DIFFER)
      } else {
        System.err.println(ERR_MSG_CHECKSUMS_DIFFER)
      }
    }
    writeThirdPartyFile(licenseFileOut, groupedByLicense, strictMode)
  }

  class ThirdPartyLibInfo(
      var libraryName: String,
      var librarySubpackage: String,
      var libraryVersion: String,
      var licenseName: String,
    var licenseLink: String) extends Comparable[ThirdPartyLibInfo] {

    var subPackageCounter: Int = 1

    if (this.licenseName == null || this.licenseName.isEmpty ||
      this.licenseName == "n/a") {
      this.licenseName = PLACEHOLDER_UNKNOWN_LICENSE_NAME
    }

    if (this.licenseLink == null || this.licenseLink == "") {
      this.licenseLink = PLACEHOLDER_UNKNOWN_LICENSE_LINK
    }

    def appendSubPackageInfo(librarySubpackage: String) {
      this.librarySubpackage = if (this.librarySubpackage == null || this.librarySubpackage.isEmpty) librarySubpackage else this.librarySubpackage + ", " + librarySubpackage
      subPackageCounter += 1
    }

    override def compareTo(other: ThirdPartyLibInfo): Int = {
      if (this.libraryName != null) {
        val libraryCompare = this.libraryName.compareTo(other.libraryName);
        if (libraryCompare != 0) {
          return libraryCompare;
        }

        if (this.librarySubpackage != null) {
          this.librarySubpackage.compareTo(other.librarySubpackage);
        } else {
          return -1;
        }
      }
      return -1;
    }

    override def toString(): String = {
      "libraryName=" + libraryName + ",librarySubpackage=" +
        librarySubpackage +
        ",libraryVersion=" +
        libraryVersion +
        ",licenseName=" +
        licenseName +
        ",licenseLink=" +
        licenseLink
    }
  }
}
