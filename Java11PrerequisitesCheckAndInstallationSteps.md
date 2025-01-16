Below are general guidelines to install **Java 11** on the three major platforms: **Windows**, **macOS**, and **Linux** using **OpenJDK** (which is open-source). 
The steps a community-based build (e.g., [Adoptium](https://adoptium.net/)). 

# Check available Java versions on your platform

These commands help you identify both the default Java being used and any additional Java installations that may be present on your system.

## macOS
- **Check the active (default) version**:  
  ```bash
  java -version
  ```
- **List all installed versions**:  
  ```bash
  /usr/libexec/java_home -V
  ```

---

## Windows
- **Check the active (default) version**:  
  ```bat
  java -version
  ```
- **Locate Java executables on the PATH**:  
  ```bat
  where java
  ```
- If needed, manually check `C:\Program Files\Java\` or `C:\Program Files (x86)\Java\` for all installations.

---

## Ubuntu
- **Check the active (default) version**:  
  ```bash
  java -version
  ```
- **List all registered Java alternatives**:  
  ```bash
  sudo update-alternatives --config java
  ```
- **See installed Java packages**:  
  ```bash
  dpkg -l | grep -E 'openjdk'
  ```


# Install Java 11 on your system

# 1. Windows

## 1.1 Install OpenJDK (Recommended for Most Users)

### Via MSI Installer (Adoptium or other vendors)
1. Go to [Adoptium.net](https://adoptium.net/).
2. Select **Temurin** (an OpenJDK distribution) for **Windows x64**.
3. Download the `.msi` installer for **Java 11**.
4. Run the installer and follow the prompts.

### Via ZIP Archive
1. Download the ZIP file for **OpenJDK 11** (e.g., from [Adoptium](https://adoptium.net/)).
2. Extract it to a folder of your choice (e.g., `C:\Java\jdk-11`).
3. Update your **PATH** and **JAVA_HOME** (optional but recommended):
   - Right-click **This PC** → **Properties** → **Advanced system settings** → **Environment Variables**.
   - Under **System variables**, create (or edit) `JAVA_HOME` to point to `C:\Java\jdk-11`.
   - Prepend `C:\Java\jdk-11\bin` to the `Path` variable.

### Verify Installation
```powershell
java -version
```
You should see something like:  
```
openjdk version "11.0.x"
```

---

# 2. macOS

## 2.1 Install OpenJDK (Homebrew)

**Prerequisite**: [Install Homebrew](https://brew.sh/) if you haven’t already.

1. Open **Terminal**.
2. Run:
   ```bash
   brew update
   brew install openjdk@11
   ```
3. To make this the default Java, you may need to run:
   ```bash
   sudo ln -sfn /usr/local/opt/openjdk@11/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-11.jdk
   ```
   (Adjust the path if Homebrew is in a different location, e.g., `/opt/homebrew` for Apple Silicon.)

### Verify Installation
```bash
java -version
```
You should see:
```
openjdk version "11.0.x"
```
---

# 3. Linux

Different Linux distributions use different package managers and naming conventions. Below are instructions for **Ubuntu/Debian** (APT), **Fedora/CentOS** (DNF/YUM), and a generic approach for **Tarball** installations.

## 3.1 Ubuntu / Debian

### OpenJDK from Official Repos
1. Update package lists:
   ```bash
   sudo apt-get update
   ```
2. Install OpenJDK 11:
   ```bash
   sudo apt-get install openjdk-11-jdk
   ```
3. Verify:
   ```bash
   java -version
   ```
   You should see:  
   ```
   openjdk version "11.0.x"
   ```

## 3.2 Fedora / CentOS / RHEL

### Using OpenJDK from Repos
- **Fedora**:
  ```bash
  sudo dnf install java-11-openjdk-devel
  ```
- **CentOS / RHEL**:
  ```bash
  sudo yum install java-11-openjdk-devel
  ```

---

# 4. Verifying Your Installation

After installing, run:
```bash
java -version
```
Expected output for OpenJDK 11:
```
openjdk version "11.0.x" ...
```
Or Oracle JDK 11:
```
java version "11.0.x" ...
```

**Key Points**:
- Make sure **`JAVA_HOME`** is set if required by development tools like Maven or Gradle.
- If you have multiple Java versions, use tools like **`update-alternatives`** (on Debian/Ubuntu) or manage your PATH carefully to switch between them.

---

## Summary

- **Windows**: Use an installer (MSI/EXE), or unzip and set environment variables.  
- **macOS**: Use **Homebrew** for OpenJDK or install an official DMG for Oracle JDK.  
- **Linux**: Most distribution package managers include OpenJDK 11. 

With these steps, you’ll have **Java 11** installed and ready to run ResearchSpace on your preferred platform. 
Always confirm by running `java -version` to ensure it reports the correct Java version.