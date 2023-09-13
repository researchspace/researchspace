<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2003 - 2013 MPIWG Berlin
  %%
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as 
  published by the Free Software Foundation, either version 3 of the 
  License, or (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Lesser Public License for more details.
  
  You should have received a copy of the GNU General Lesser Public 
  License along with this program.  If not, see
  <http://www.gnu.org/licenses/lgpl-3.0.html>.
  #L%
  Author: Robert Casties (robcast@berlios.de)
  --%><%@page language="java" 
  import="digilib.util.DigilibJobCenter,
          digilib.servlet.DigilibBean,
          digilib.conf.DigilibServletConfiguration,
          digilib.conf.DigilibServletRequest,
          digilib.io.DocuDirCache,
          digilib.image.DocuImage,
          digilib.image.DocuImageFactory,
          java.io.File"%>
<%!
// authentication stuff - robert
// -----------------------------
// create DocumentBean instance for all JSP requests
DigilibBean docBean = new DigilibBean();

// initialize DocumentBean instance in JSP init
public void jspInit() {
    try {
        // set servlet init-parameter
        docBean.setConfig(getServletConfig());
    } catch (javax.servlet.ServletException e) {
        System.out.println(e);
    }
}
%>

<%
// get digilib config
DigilibServletConfiguration dlConfig = docBean.getDlConfig();
// parsing the query
DigilibServletRequest dlRequest = new DigilibServletRequest(request);
// dir cache
DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
// image JobCenter
DigilibJobCenter<DocuImage> imageProcessor =  (DigilibJobCenter<DocuImage>) dlConfig.getValue("servlet.worker.imageexecutor");
%>

<html>
<head>
<title>Digilib configuration page</title>
</head>
<body>

<h1>Global servlet configuration</h1>

<table>
<%
    Object[] keys = dlConfig.getParams().keySet().toArray();
    java.util.Arrays.sort(keys);
    int l = keys.length;
    for (int i = 0; i < l; i++) {
        String key = (String) keys[i];
       	digilib.util.Parameter param = dlConfig.get(key);
        String val;
        if (key.equals("basedir-list")) {
            String[] bd = (String[]) param.getValue();
            val = "";
            if (bd != null) {
                for (int j = 0; j < bd.length; j++) {
                    val += bd[j] + "<br> ";
                }
            }
        } else if (param.getValue() instanceof java.io.File) {
            java.io.File f = (java.io.File) param.getValue();
            if (f == null) {
                val = "[null]";
            } else {
                if (!f.isAbsolute()) {
                    // relative path -> use getRealPath to resolve
                    String fn = pageContext.getServletContext().getRealPath("/" + f.getPath());
                    if (fn == null) fn = "";
                    f = new File(fn);
                }
                if (f.canRead()) {
                    val = f.toString();
                } else {
                    val = "[missing file] "+f.toString();
                }
            }
        } else {
            val = param.getAsString();
        }
        if (val.length() == 0) {
            val = "[none]";
        }
%>
  <tr>
    <td valign="top"><%= key %></td><td><b><%= val %></b></td>
    <td></td>
  </tr>
<%
   }
%>
</table>

<h2>Threads</h2>

<table>
  <tr>
    <td>currently waiting</td><td><b><%= imageProcessor.getWaitingJobs() %></b></td>
    <td></td>
  </tr>
  <tr>
    <td>currently running</td><td><b><%= imageProcessor.getRunningJobs() %></b></td>
    <td></td>
  </tr>
</table>

<h2>Webapp</h2>

<table>
  <tr>
    <td>total runtime </td><td><b><%= (System.currentTimeMillis() - dlConfig.webappStartTime)/1000 %></b></td>
  </tr>
</table>

<h2>Directory cache</h2>

<table>
  <tr>
	<td>size</td><td><b><%= dirCache.size() %></b></td>
    <td>directories</td>
  </tr>
  <tr>
    <td></td><td><b><%= dirCache.getNumFiles() %></b></td>
    <td>image files (approximately)</td>
  </tr>
  <tr>
	<td>hits</td><td><b><%= dirCache.getHits() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>misses</td><td><b><%= dirCache.getMisses() %></b></td>
    <td></td>
  </tr>
</table>

<h2>JVM configuration</h2>

<table>
  <tr>
	<td>java.awt.headless</td><td><b><%= System.getProperty("java.awt.headless") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>java.version</td><td><b><%= System.getProperty("java.version") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>java.vendor</td><td><b><%= System.getProperty("java.vendor") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>os.name</td><td><b><%= System.getProperty("os.name") %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.maxMemory</td><td><b><%= Runtime.getRuntime().maxMemory() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.totalMemory</td><td><b><%= Runtime.getRuntime().totalMemory() %></b></td>
    <td></td>
  </tr>
  <tr>
	<td>Runtime.freeMemory</td><td><b><%= Runtime.getRuntime().freeMemory() %></b></td>
    <td></td>
  </tr>
</table>

<h2>DocuImage configuration</h2>

<p>Supported image types</p>
<ul>
<% 
  java.util.Iterator<String> dlfs = DocuImageFactory.getInstance().getSupportedFormats();
  for (String f = dlfs.next(); dlfs.hasNext(); f = dlfs.next()) {
%>
  <li><%= (String)f %></li>
<% 
  }
%>
</ul>


</body>
</html>
