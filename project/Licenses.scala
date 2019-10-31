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

import com.typesafe.sbt.SbtLicenseReport.autoImport._
import com.typesafe.sbt.license.DepModuleInfo
import com.typesafe.sbt.license.LicenseInfo
import com.banno.license.Plugin._
import com.banno.license.Plugin.LicenseKeys._

object Licenses {

  //built in licenses: PublicDomain, CommonPublic, Mozilla, MIT, BSD, Apache, LGPL, GPLClasspath, GPL
  object builtin {
    val Apache = LicenseCategory("Apache")
    val CDDL = LicenseCategory("CDDL")
    val BSD = LicenseCategory("BSD")
    val BSD2 = LicenseCategory("BSD2")
    val BSD3 = LicenseCategory("BSD3")
    val BSDStyle = LicenseCategory("BSD-style")
    val LGPL = LicenseCategory("LGPL")
    val MITStyle = LicenseCategory("MIT-style")
    val MIT = LicenseCategory("MIT")
    val MPL = LicenseCategory("Mozilla")
    val PublicDomain = LicenseCategory("PublicDomain")
    val Custom = LicenseCategory("Custom")
    val Eclipse = LicenseCategory("Eclipse")
  }

  object licenseinfo {
    val LicenseApache2 =
      LicenseInfo(Licenses.builtin.Apache, "Apache License 2.0", "http://www.apache.org/licenses/LICENSE-2.0.txt")

    val LicenseBSD =
      LicenseInfo(Licenses.builtin.BSD, "BSD", "http://directory.fsf.org/wiki/License:BSD_3Clause")

    val LicenseBSD2 =
      LicenseInfo(Licenses.builtin.BSD2, "BSD 2-Clause", "http://opensource.org/licenses/bsd-license.php")

    val LicenseBSD3 =
      LicenseInfo(Licenses.builtin.BSD3, "BSD 3-Clause", "https://opensource.org/licenses/BSD-3-Clause")

    val LicenseMIT =
      LicenseInfo(Licenses.builtin.MIT, "MIT", "http://opensource.org/licenses/MIT")

    val LicenseMPL20 =
      LicenseInfo(Licenses.builtin.MPL, "Mozilla Public License (MPL) 2.0", "https://www.mozilla.org/MPL/2.0/")

    val LicenseLGPL =
      LicenseInfo(Licenses.builtin.LGPL, "GNU Lesser Public License (LGPL)", "http://www.gnu.org/licenses/lgpl.html")

    val LicenseLGPL21 =
      LicenseInfo(Licenses.builtin.LGPL, "GNU Lesser Public License (LGPL) 2.1", "http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html")

    val LicenseLGPL30 =
      LicenseInfo(Licenses.builtin.LGPL, "GNU Lesser Public License (LGPL) 3.0", "https://www.gnu.org/licenses/lgpl-3.0.en.html")

    val LicenseCDDL =
      LicenseInfo(Licenses.builtin.CDDL, "CDDL", "https://glassfish.java.net/public/CDDLv1.0.html")

    val LicensePublicDomain =
      LicenseInfo(Licenses.builtin.PublicDomain, "Public Domain", "http://creativecommons.org/licenses/publicdomain")

    val LicenseEclipse =
      LicenseInfo(Licenses.builtin.Eclipse, "Eclipse Distribution License v1.0", "http://www.eclipse.org/org/documents/edl-v10.php")
  }

  val metaphactsLicenseOverrides:PartialFunction[DepModuleInfo, LicenseInfo] = {
    // Apache 2.0
    case DepModuleInfo("com.google.guava", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-beanutils", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-codec", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-collections", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-io", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-lang", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("commons-logging", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("com.github.jknack", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("org.semarglproject", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("org.secnod.shiro", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("jakarta-regexp", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("org.jukito", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo("ro.fortsoft.pf4j", _, _) => licenseinfo.LicenseApache2
    case DepModuleInfo(org, _, _) if org startsWith "org.apache" => licenseinfo.LicenseApache2
    case DepModuleInfo(org, _, version) if ((org startsWith "com.fasterxml.jackson") && (version startsWith "2")) => licenseinfo.LicenseApache2
    case DepModuleInfo(org, _, _) if org startsWith "com.google.inject" => licenseinfo.LicenseApache2
    case DepModuleInfo(org, _, _) if org startsWith "taglibs" => licenseinfo.LicenseApache2

    // BSD style
    case DepModuleInfo("org.antlr", _, version) if version startsWith "4" => licenseinfo.LicenseBSD
    case DepModuleInfo("org.hamcrest", _, version) => licenseinfo.LicenseBSD
    case DepModuleInfo("org.owasp.encoder", _, version) => licenseinfo.LicenseBSD
    case DepModuleInfo("com.github.jsonld-java", _, version) => LicenseInfo(Licenses.builtin.BSDStyle, "BSD style", "https://raw.githubusercontent.com/jsonld-java/jsonld-java/master/LICENCE")
    case DepModuleInfo("org.ow2.asm", _, _) => LicenseInfo(Licenses.builtin.BSDStyle, "BSD style", "http://asm.ow2.org/license.html")
    case DepModuleInfo("com.twelvemonkeys.imageio", _, version) => licenseinfo.LicenseBSD3
    case DepModuleInfo("com.twelvemonkeys.common", _, version) => licenseinfo.LicenseBSD3

    // CDDL
    case DepModuleInfo(org, _, _) if org startsWith "org.glassfish.hk2" => licenseinfo.LicenseCDDL
    case DepModuleInfo(org, _, _) if org startsWith "org.glassfish.jersey" => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.servlet", _, _) => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.activation", _, _) => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.mail", _, _) => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.annotation", _, _) => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.ws.rs", _, _) => licenseinfo.LicenseCDDL
    case DepModuleInfo("javax.xml.stream", "stax-api", _) => licenseinfo.LicenseCDDL

    // LGPL
    case DepModuleInfo("com.google.code.findbugs", _, _) => licenseinfo.LicenseLGPL

    // MIT
    case DepModuleInfo("org.json", _, _) => LicenseInfo(Licenses.builtin.MITStyle, "MIT style", "http://www.json.org/license.html")
    case DepModuleInfo("org.slf4j", _, _) => LicenseInfo(Licenses.builtin.MITStyle, "MIT style", "http://www.slf4j.org/license.html")
    case DepModuleInfo("com.codepoetics", "protonpack", _) => LicenseInfo(Licenses.builtin.MITStyle, "MIT", "https://raw.githubusercontent.com/poetix/protonpack/protonpack-1.15/LICENSE")
    case DepModuleInfo("org.bouncycastle", _, _) => LicenseInfo(Licenses.builtin.MITStyle, "MIT style", "https://www.bouncycastle.org/licence.html")

    // Eclipse
    case DepModuleInfo("org.eclipse.rdf4j", _, version) => licenseinfo.LicenseEclipse
    case DepModuleInfo("junit", _, version) => licenseinfo.LicenseEclipse
    case DepModuleInfo("org.locationtech.jts", _, version) => licenseinfo.LicenseEclipse
    case DepModuleInfo("org.eclipse.jgit", _, version) => LicenseInfo(Licenses.builtin.Eclipse, "Eclipse Distribution License v1.0", "https://github.com/eclipse/jgit/blob/v5.4.0.201906121030-r/LICENSE")

    // Public Domain
    case DepModuleInfo("aopalliance", _, version) => licenseinfo.LicensePublicDomain
  }
}
