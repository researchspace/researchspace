README

Prerequisite
ResearchSpace is a Java-based application and it requires your system has Java 11 installed.

Please, follow the steps in the file Java11PrerequisitesCheckAndInstallationSteps.txt
 inside this folder to verify your system has Java running or install the appropriate version. 

If your system has several versions of Java installed,
please edit all `.sh` or `.bat` files and specify the path to Java 11.

For example the line
java -Dfile.encoding=UTF8 -cp "${DIR}/starter/*:${DIR}/starter/logback-config" org.akhikhl.gretty.GrettyStarter $@ start

will be modified to something like 
/Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home/bin/java -Dfile.encoding=UTF8 -cp "${DIR}/starter/*:${DIR}/starter/logback-config" org.akhikhl.gretty.GrettyStarter $@ start
where /Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home/bin/java is an example of Java 11 local path.
Running ResearchSpace


1. Start platform
   Linux/Unix:
        chmod +x start.sh
        ./start.sh
   Windows:
        start.bat
2. Open http://localhost:10214/ in your browser
3. Login with admin/admin