 import com.metaphacts.Licenses._
  import util.control.Breaks._

  //TASK: add license header to typescript files
lazy val addLicenseToTypescript= taskKey[Unit]("Adding license header to typescript files in platform-web")

 addLicenseToTypescript := {
      val lineSeparator = System.getProperty("line.separator")
      
      def getFileTree(f: File): Stream[File] = {
          f #:: (if (f.isDirectory) f.listFiles().toStream.flatMap(getFileTree) 
                 else Stream.empty)
      }
      def commentedLicenseTextLines(licenseText: String): List[String] = {
          val commentedLines = licenseText.split('\n').map { line => if (line == "") " *" else " * " + line }.toList
          ("/*!" :: commentedLines ::: " */" :: Nil)
      }
      getFileTree(new File("./platform-web/src/main")).filter(_.getName.endsWith(".ts")).foreach( path => { breakable {
        val header = commentedLicenseTextLines(metaphactsLicenseLGPL("Copyright (C) 2015-2016, metaphacts GmbH")).mkString(lineSeparator);
        val src = scala.io.Source.fromFile(path)
        val withHeader = new File(path + ".withHeader")
       
        try {
          val firstLine = src.getLines.next();
          var rest = src.mkString
          if(firstLine.startsWith("/*!") || rest.startsWith("/*!"))
            break
          if(firstLine.startsWith("///")) {
            IO.append(withHeader, firstLine)
            IO.append(withHeader, lineSeparator)
          } else{
            rest = firstLine + rest;
          }
          IO.append(withHeader, header)
          IO.append(withHeader, lineSeparator)
          IO.append(withHeader, rest)
           
        }finally {
          src.close()
        }

        IO.copyFile(withHeader, path.asFile, true)
    
        if (! withHeader.delete)
          throw new IllegalStateException("Unable to delete " + withHeader)
            
        println("Added license header to typescript source file: " + path)
      }}
      
      )
  }