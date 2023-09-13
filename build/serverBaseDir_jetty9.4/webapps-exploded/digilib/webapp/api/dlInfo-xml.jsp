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
          digilib.conf.DigilibServletRequest"%><%!
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
// parsing the query
DigilibServletRequest dlRequest = new DigilibServletRequest(request);
docBean.setRequest(dlRequest);

%><!-- Automatically generated XML snippet with document parameters -->
<document-parameters>
<%
    Object[] keys = dlRequest.getParams().keySet().toArray();
    java.util.Arrays.sort(keys);
    int l = keys.length;
    for (int i = 0; i < l; i++) {
	String key = (String) keys[i];
	String val = dlRequest.getAsString(key);
	if (val.length() == 0) {
	    val = "";
	}
%>  <parameter name="<%= key %>" value="<%= val %>"/>
<%
       }
%></document-parameters>
