<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2004 - 2013 MPIWG Berlin
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
  --%><%@ page language="java"
    import="digilib.servlet.DigilibBean,
          digilib.conf.DigilibServletConfiguration,
          digilib.conf.DigilibServletRequest,
          digilib.io.DocuDirCache,
          digilib.io.DocuDirent,
          digilib.meta.MetadataMap"%><%!
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
%><%@ page contentType="text/xml" pageEncoding="UTF-8"%><?xml version="1.0" encoding="UTF-8" ?>
<%
// process request
// get digilib config
DigilibServletConfiguration dlConfig = docBean.getDlConfig();
// parsing the query
DigilibServletRequest dlRequest = new DigilibServletRequest(request);
// dir cache
DocuDirCache dirCache = (DocuDirCache) dlConfig.getValue("servlet.dir.cache");
%><!-- Automatically generated XML snippet with document context -->
<result>
<%
int pn = dlRequest.getAsInt("pn");
String fn = dlRequest.getFilePath();
String ctx = "";
DocuDirent f = dirCache.getFile(fn, pn);
if (f != null) {
    //ctx = "hasfile:"+f.getName();
    f.checkMeta();
    MetadataMap meta = f.getMeta().getFileMeta();
    if (meta != null) {
    	//ctx = "JSP:hasmeta!";
    	if (meta.containsKey("context")) {
    	    ctx = (String) meta.get("context");
    	}
    }
}
%><%= ctx %>
</result>
