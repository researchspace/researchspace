/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as request from 'platform/api/http';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as Immutable from 'immutable';

import { BatchedPool, requestAsProperty } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';

export interface SecurityUtilI {
  isPermitted(permissionString: string): Kefir.Property<boolean>;
  getUser(callback?: (user: UserI) => void): Promise<UserI>;
  isAnonymous(callback: (whetherIsAnonymous: boolean) => void): void;
}

export namespace Permissions {
  export const templateSave = 'pages:edit:save';

  const sparqlQueryEditor = 'ui:component:view:mp:sparql:query:editor';
  /** Dropdown to select other endpoints for debugging purpose. */
  export const queryEditorSelectEndpoint = `${sparqlQueryEditor}:select:repository`;

  /**
   * Permission for page explore actions - Ontodia, Graph View, Table View.
   */
  export const pageToolbarExplore = 'ui:page:view:toolbar:explore';

  export const sparqlSelect = 'sparql:query:select';
  export const qaasInfo = 'qaas:info';

  /**
   * Constructs permission string to perform specified action on an LDP resource.
   * (Based on Permissions.java)
   */
  export function toLdp(
    base: 'container' | 'type',
    resource: Rdf.Iri,
    action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'import',
    ownership: 'any' | 'owner'
  ) {
    return `api:ldp:${base}:<${resource.value}>:${action}:${ownership}`;
  }
}

export interface PermissionDocumentation {
  readonly acl: string;
  readonly description: string;
  readonly example: string;
}

export interface UserI {
  principal?: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  userURI: string;
}

export interface SessionInfoI {
  lastAccessTimestamp: number;
  timout: number;
  idleTime: number;
}

export interface Account {
  principal: string;
  password: string;
  roles: string;
  permissions?: string;
}

export interface RoleDefinition {
  roleName: string;
  permissions: Array<string>;
}

export class NotEnoughPermissionsError extends Error {
  __proto__: Error;
  constructor(message) {
    const trueProto = new.target.prototype;
    super(message);
    this.__proto__ = trueProto;
  }
}

export class SecurityUtil implements SecurityUtilI {
  private pool = new BatchedPool<string, boolean>({ fetch: (perms) => this.fetchPermitted(perms.toArray()) });

  public getUser(cb?: (user: UserI) => void): Promise<UserI> {
    if (cb) {
      this.getUser().then(cb);
      return;
    }

    // TODO cache
    const WINDOW_user = 'cache_user';
    if (!_.isUndefined(window[WINDOW_user])) {
      return Promise.resolve(window[WINDOW_user]);
    }

    return new Promise((resolve, reject) => {
      request
        .get('/rest/security/user')
        .type('application/json')
        .accept('application/json')
        .end((err, res) => {
          if (err) {
            reject(err);
          } else {
            const user = <UserI>JSON.parse(res.text);
            window[WINDOW_user] = user;
            resolve(user);
          }
        });
    });
  }

  public isPermitted(permissionString: string): Kefir.Property<boolean> {
    return this.pool.query(permissionString);
  }

  private fetchPermitted(permissionStrings: string[]): Kefir.Property<Immutable.Map<string, boolean>> {
    const req = request
      .post('/rest/security/permissions')
      .send(permissionStrings)
      .type('application/json')
      .accept('application/json');
    return Kefir.fromNodeCallback<{ [permission: string]: boolean }>((cb) => req.end((err, res) => cb(err, res.body)))
      .toProperty()
      .map((batch) => Immutable.Map(batch));
  }

  /**
   * Checks with backend whether the current logged-in subject is a anonymous user.
   * Value is cached in current window scope i.e. will be refreshed only if
   * user opens new tab or tab is reloaded e.g. due to login/logout.
   * @param {Function} cb callback
   */
  public isAnonymous(cb): void {
    // TODO cache
    const WINDOW_isAnonymousUser = 'cache_isAnonymousUser';
    if (!_.isUndefined(window[WINDOW_isAnonymousUser])) {
      cb(window[WINDOW_isAnonymousUser]);
      return;
    }
    this.getUser((userObject) => {
      window[WINDOW_isAnonymousUser] = (<UserI>userObject).isAnonymous;
      cb((<UserI>userObject).isAnonymous);
    });
  }

  public getSessionInfo(cb) {
    return request
      .get('/rest/security/getSessionInfo')
      .type('application/json')
      .accept('application/json')
      .end((err, res) => {
        cb(<SessionInfoI>JSON.parse(res.text));
      });
  }

  public touchSession(cb) {
    return request.post('/rest/security/touchSession').end((err, res: request.Response) => {
      cb(res.status);
    });
  }

  public getAllAccounts(): Kefir.Property<Account[]> {
    const req = request.get('/rest/security/getAllAccounts').type('application/json').accept('application/json');

    return Kefir.fromNodeCallback<Account[]>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err.message : null, res.ok ? <Account[]>JSON.parse(res.text) : null);
      })
    ).toProperty();
  }

  getDocumentationForAllPermissions(): Kefir.Property<PermissionDocumentation[]> {
    const req = request.get('/rest/security/getAllPermissionsDoc').type('application/json').accept('application/json');
    return requestAsProperty(req).map((res) => res.body);
  }

  public createAccount(account: Account): Kefir.Property<boolean> {
    const req = request.post('/rest/security/createAccount').send(account).type('application/json');

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err.response.text : null, res.ok ? true : null);
      })
    ).toProperty();
  }

  public updateAccount(account: Account): Kefir.Property<boolean> {
    const req = request.put('/rest/security/updateAccount').send(account).type('application/json');

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err.response.text : null, res.ok ? true : null);
      })
    ).toProperty();
  }

  public deleteAccount(account: Account): Kefir.Property<boolean> {
    const req = request.del('/rest/security/deleteAccount/' + account.principal);

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err.response.text : null, res.ok ? true : null);
      })
    ).toProperty();
  }

  public getRoleDefinitions(): Kefir.Property<RoleDefinition[]> {
    const req = request.get('/rest/security/getAllRoleDefinitions').type('application/json').accept('application/json');

    return Kefir.fromNodeCallback<RoleDefinition[]>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err : null, res.ok ? <RoleDefinition[]>JSON.parse(res.text) : null);
      })
    ).toProperty();
  }

  isPermissionValid(permission: string): Kefir.Property<boolean> {
    const req = request
      .put('/rest/security/isPermissionValid')
      .send(permission)
      .type('application/json')
      .accept('application/json');

    return requestAsProperty(req).map((res) => res.body);
  }

  updateRoleDefinitions(roles: RoleDefinition[]): Kefir.Property<boolean> {
    const req = request.put('/rest/security/updateRoleDefinitions').send(roles).type('application/json');

    return requestAsProperty(req).map((res) => res.ok);
  }
}

export const Util = new SecurityUtil();
