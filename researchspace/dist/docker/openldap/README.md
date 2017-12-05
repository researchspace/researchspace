# openLDAP + pwm + phpLDAPadmin
This docker-compose setup consists of:
1. openLDAP - LDAP server with automatic backup see [https://github.com/osixia/docker-openldap-backup]
2. pwm - user self-service for LDAP [https://github.com/pwm-project/pwm]
3. phpLDAPadmin - [https://github.com/osixia/docker-phpLDAPadmin]
4. sample data

# Configuration
see .env file

# Setup
## Test Environment
1. TLS is disabled
2. Ports for phpLDAPadmin and pwm are exposed to the host

To start LDAP bundle in test mode simply execute the following command:
`docker-compose -f docker-compose.yml -f docker-compose.testing.yml -d up`

After that openldap will be available on port 389, pwm on localhost:10089/pwm and phpLDAPadmin on localhost:10088.

### Sample LDAP data
In general the same LDAP instance can be used to manage multiple platform installations. In the sample dataset deployments are managed under `ou=deployments,dc=example,dc=com`, there is one sample deployment - `ou=platform.example.com,ou=deployments,dc=example,dc=com`.

In future it can be possible to manage not only platform permissions but also permissions for IIIF server, blazegraph instance, etc. Sample data has permissions only for the platform under `ou=platform,ou=platform.example.com,ou=deployments,dc=example,dc=com`. Two user groups are defined there, one for admin users and one for guests. This groups should be mapped to platform instance groups in the `shiro-ldap.ini` file using `ldapRealm.groupRolesMap` property.

In the example bellow we map `cn=admin,ou=platform,ou=platform.example.com,ou=deployments,dc=example,dc=com` LDAP group to `admin` platform instance group and `cn=guest,ou=platform,ou=platform.example.com,ou=deployments,dc=example,dc=com` to `guest`.

Users are defined under `ou=users,dc=example,dc=com`, it is possible to use nested `organizationalUnit` to group users according to some scheme, e.g organization.

### Platform Configuration
One can immediately connect platform to ldap. Put the following `shiri-ldap.ini` based on sample data to the platform config folder:

```
[main]
ldapRealm = com.metaphacts.security.LDAPRealm
ldapRealm.groupMemberAttribute = uniqueMember
ldapRealm.groupIdentifierAttribute=cn
ldapRealm.searchBase = dc=example,dc=com
ldapRealm.userIdentifierAttribute=uid
ldapRealm.userObjectClass=person
ldapRealm.contextFactory.url = ldap://127.0.0.1:389
ldapRealm.contextFactory.systemUsername = cn=platform,dc=example,dc=com
ldapRealm.contextFactory.systemPassword = password
ldapRealm.groupRolesMap = "cn=admin,ou=platform,ou=platform.example.com,ou=deployments,dc=example,dc=com":"admin", "cn=guest,ou=platform,ou=platform.example.com,ou=deployments,dc=example,dc=com":"guest"
securityManager.realms = $ldapRealm

```

Restart the platform and try to login with user `admin@example.com`(password=password) or `guest@example.com`(password=password)

### PWM configuration
PWM has many different features like password restore by user, user activation, self registration, etc. Refer to the documentation for more detail - [https://docs.google.com/document/d/1BBHPcOUxZytrqncYFInTaY2PXgW5p1EmzwV8zcpspRg/pub]

There is sample PWM configuration that one can use for quick start and local testing, see `pwm/PwmConfiguration.xml` file. It can be imported through PWM web interface. This configuration will work out of the box in testing environment for self password change by users. All other features requires proper SMTP setup.

Configuration password - password
pwm admin - admin/password

## Production Environment
1. TLS is enabled (proper certificates should be provided)
2. Assume that nginx-proxy is setup
3. Only port 636 is exposed to the host. (Make sure that access to this port is allowed in the system firewall!)

To start LDAP bundle in production mode simply execute the following command:
`docker-compose -f docker-compose.yml -f docker-compose.production.yml -d up`
