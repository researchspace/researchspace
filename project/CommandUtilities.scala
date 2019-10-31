import sbt.Process

/*
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

import RootBuildOptions._

object CommandUtilities {
 /**
  * Function generate command via ProcessBuilder
  * i.e. on windows command needs to be called via "cmd /C "
  */
  def generateCmd(command: String*): Array[String] = {
    val osname = System.getProperty("os.name", "generic").toLowerCase();
    if(osname.indexOf("win") >= 0){
      return Array.concat(Array("cmd", "/C"), command.toArray);
    }else {
      return command.toArray;
    }
  }

 /**
  * Function generate command for NPM invocation via ProcessBuilder
  * i.e. on windows npm needs to be called via "cmd /C npm "
  */
  def generateNPMcmd(command: String*) : Array[String] = {
    val cmd = Array.concat(Array("npm"), command.toArray)
    return generateCmd(cmd:_*);
  }

  def runProcessWithEnv(command: Array[String], cwd: sbt.File) = {
    Process(command, cwd, (buildJsonParamName, buildJsonPath))
  }
}

