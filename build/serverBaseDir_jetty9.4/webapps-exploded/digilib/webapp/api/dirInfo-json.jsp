<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2016 Bibliotheca Hertziana, MPIWG Berlin
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
  Authors: Robert Casties (robcast@users.sourceforge.net), Martin Raspe
  --%><%@ page language="java"
    import="digilib.servlet.DigilibBean,
          digilib.conf.DigilibServletConfiguration,
          digilib.conf.DigilibServletRequest,
          digilib.conf.DigilibOption,
          digilib.io.DocuDirectory,
          digilib.io.DocuDirent,
          digilib.io.FileOps,
          java.io.File"%><%!
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
%><%@ page contentType="application/json" pageEncoding="UTF-8" %><%
// process request
docBean.setRequest(request);
// get directory
DocuDirectory dir = docBean.getDirectory();
int dirSize = docBean.getNumPages();
%>
{<%  
if (dir != null) {
%>
  "url_path" : "<%= dir.getDirName() %>",
<%
    if (docBean.isUseAuthorization()) {
%>  "auth_required" : <%= ! docBean.isAuthorized() %>,
<%
    }
%>  "count" : "<%= dirSize %>",
  "files" : [
<%
    if (!docBean.getRequest().hasOption(DigilibOption.dir)) {
        // list all files
        for (int i = 0; i < dirSize; i++) {
            DocuDirent f = dir.get(i);
            String fn = (f != null) ? f.getName() : "null";
%>{
  "index" : <%= i+1 %>,
  "fn" : "<%= FileOps.basename(fn) %>",
  "file" : "<%= fn %>"
}<%
            if (i+1 < dirSize) {%>,
<%          }
        } // for 
    } // if not dironly
%>
]<%
} // if dir 
%>
}
