# RESTSail Documentation

## Table of Contents
- [Introduction](#introduction)
- [Class Hierarchy](#class-hierarchy)
- [Configuration Options](#configuration-options)
- [Authentication Methods](#authentication-methods)
- [HTTP Request Configuration](#http-request-configuration)
- [Request Body Options](#request-body-options)
- [URL and Query Parameters](#url-and-query-parameters)
- [Response Processing](#response-processing)
- [Example Configurations](#example-configurations)
- [Usage Examples](#usage-examples)

## Introduction

The RESTSail system provides a flexible way to integrate external REST APIs with the ResearchSpace platform. It extends the RDF4J Sail interface to allow querying REST APIs using SPARQL, effectively treating REST APIs as RDF data sources.

The system translates SPARQL queries into REST API calls, processes the responses (typically JSON), and converts them back into SPARQL binding sets. This allows seamless integration of external data sources into the semantic web framework of ResearchSpace.

## Class Hierarchy

The RESTSail system consists of several key classes:

- **RESTSail**: Main implementation class that extends `AbstractServiceWrappingSail`
  - Manages the HTTP client
  - Handles initialization of authentication and filters

- **RESTSailConfig**: Configuration class that extends `AbstractServiceWrappingSailConfig`
  - Stores configuration parameters for REST API calls
  - Handles serialization and deserialization of configuration

- **RESTSailConnection**: Connection class that extends `AbstractServiceWrappingSailConnection`
  - Executes REST API calls
  - Processes responses and converts them to binding sets

- **RESTSailFactory**: Factory class for creating RESTSail instances

- **RESTWrappingSailUtils**: Utility class with helper methods for parameter extraction

## Configuration Options

### Basic Connection Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `url` | The base URL for the REST service | (Required) |
| `serviceID` | Identifier for the service being implemented | (Optional) |

### Authentication Methods

#### Basic Authentication

| Parameter | Description |
|-----------|-------------|
| `username` | Username for HTTP Basic Authentication |
| `password` | Password for HTTP Basic Authentication |

#### API Key Authentication

| Parameter | Description |
|-----------|-------------|
| `authorizationKey` | The name of the authorization parameter (e.g., "api_key", "token") |
| `authorizationValue` | The actual value of the authorization parameter |
| `authorizationLocation` | Where to place the authorization parameter (`PARAMETER` or `HEADER`) |

## HTTP Request Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `httpMethod` | The HTTP method to use (GET, POST, etc.) | GET |
| `inputFormat` | Format for request body | JSON |
| `mediaType` | The Accept header for the response | application/json |
| `httpHeaders` | Custom HTTP headers as key-value pairs | {} |
| `requestRateLimit` | Limit on requests per second | (None) |
| `userAgent` | Custom User-Agent header | Default User-Agent |

## Request Body Options

### JSON Body (for POST requests)

The system constructs a JSON body from input parameters, with support for nested structures using JSON paths:

- Parameters can be placed at specific paths in the JSON structure using dot notation
- Example: A parameter with JSON path "user.profile.id" would be placed in `{"user": {"profile": {"id": "value"}}}`

### Form URL Encoded (for POST requests)

Parameters can be sent as application/x-www-form-urlencoded format.

## URL and Query Parameters

### Path Parameters

The system supports replacing path parameters in URLs:

- Example: For a URL like "https://api.example.com/v2/object/{objectid}", the {objectid} part will be replaced with the actual value

### Query Parameters

Parameters can be added to the URL query string:

- These are automatically added for GET requests
- For POST requests, they can still be added to the URL while the main data goes in the body

## Response Processing

### JSON Path

The system can extract specific data from JSON responses using JSON Path expressions:

- **Root Path**: Specifies where in the JSON response to start processing (defaults to "$" - the root)
- **Parameter JSON Paths**: Each output parameter can specify a JSON path to extract specific values

### Response Conversion

The system converts JSON responses to SPARQL binding sets:

- JSON arrays are processed as multiple binding sets (one per array item)
- JSON objects are processed as a single binding set
- Values are converted to appropriate RDF types based on configuration

## Example Configurations

### Basic GET Request

```java
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/data");
config.setHttpMethod("GET");
```

### GET with API Key Authentication

```java
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/data");
config.setHttpMethod("GET");
config.setAuthKey("api_key");
config.setAuthValue("your-api-key-here");
config.setAuthLocation("PARAMETER"); // Adds as query parameter
```

### POST with JSON Body

```java
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/data");
config.setHttpMethod("POST");
config.setInputFormat("JSON");
config.setMediaType("application/json");
```

### Custom Headers

```java
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/data");
config.getHttpHeaders().put("X-Custom-Header", "custom-value");
```

## Usage Examples

### Example 1: Simple GET Request

This example shows how to configure a RESTSail to make a simple GET request to an API:

```java
// Create and configure the RESTSail
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/users");
config.setHttpMethod("GET");

RESTSail sail = new RESTSail(config);
sail.initialize();

// Use the sail in a repository
Repository repo = new SailRepository(sail);
```

### Example 2: POST with Authentication

This example shows how to configure a RESTSail to make a POST request with authentication:

```java
// Create and configure the RESTSail
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/users");
config.setHttpMethod("POST");
config.setInputFormat("JSON");
config.setMediaType("application/json");

// Add authentication
config.setAuthKey("Authorization");
config.setAuthValue("Bearer your-token-here");
config.setAuthLocation("HEADER");

RESTSail sail = new RESTSail(config);
sail.initialize();

// Use the sail in a repository
Repository repo = new SailRepository(sail);
```

### Example 3: Processing JSON Response

This example shows how to configure a RESTSail to process a JSON response:

```java
// Create and configure the RESTSail
RESTSailConfig config = new RESTSailConfig();
config.setUrl("https://api.example.com/v1/users");
config.setHttpMethod("GET");

// Configure service descriptor with output parameters
ServiceDescriptor descriptor = new ServiceDescriptor();
Parameter nameParam = new Parameter();
nameParam.setParameterName("name");
nameParam.setJsonPath("$.name");
nameParam.setValueType(XMLSchema.STRING);
descriptor.getOutputParameters().put("name", nameParam);

RESTSail sail = new RESTSail(config);
sail.setServiceDescriptor(descriptor);
sail.initialize();

// Use the sail in a repository
Repository repo = new SailRepository(sail);
```

---

## Additional Resources

- [RDF4J Documentation](https://rdf4j.org/documentation/)
- [JSON Path Syntax](https://github.com/json-path/JsonPath)
- [JAX-RS Client API](https://eclipse-ee4j.github.io/jersey.github.io/documentation/latest/client.html)
