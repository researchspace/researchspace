<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2003 - 2016 MPIWG Berlin
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
  import="digilib.io.ImageSet, 
          digilib.io.ImageFile, 
          digilib.util.ImageSize,
          digilib.servlet.DigilibBean"
	contentType="application/json"%><%!
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
// parsing the query
docBean.setRequest(request);
// get file
ImageSet imgFile = docBean.getImageSet();

%>{<%
if (imgFile != null) {
    imgFile.checkMeta();
    ImageFile img = (ImageFile) imgFile.getBiggest();
    ImageSize imgSize = img.getSize(); 
%>
  "filename" : "<%= img.getName() %>",
<%
    if (docBean.isUseAuthorization()) {
%>  "auth_required" : <%= !docBean.isAuthorized() %>,
<%
    }
%>  "aspect" : <%= imgFile.getAspect() %>,
  "dpi_x" : <%= imgFile.getResX() %>,
  "dpi_y" : <%= imgFile.getResY() %><%
  
        if (imgSize != null) { 
%>,
  "width" : <%= imgSize.getWidth() %>,
  "height" : <%= imgSize.getHeight() %>
<% 		}
  	} 
%>}
