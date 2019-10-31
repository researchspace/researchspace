/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

class BrowserDetector {

  private _userAgent: string;
  private _browserName: string;
  private _fullVersion: string;
  private _majorVersion: number;

  constructor() {

    let nameOffset: number;
    let verOffset: number;
    let index: number;
    this._userAgent = navigator.userAgent;
    this._browserName  = navigator.appName;
    this._fullVersion  = '' + parseFloat(navigator.appVersion);
    this._majorVersion = parseInt(navigator.appVersion, 10);

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = this._userAgent.indexOf("Opera")) != -1) {
      this._browserName = "Opera";
      this._fullVersion = this._userAgent.substring(verOffset + 6);
      if ((verOffset = this._userAgent.indexOf("Version")) != -1) {
        this._fullVersion = this._userAgent.substring(verOffset + 8);
      }
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = this._userAgent.indexOf("MSIE")) != -1) {
      this._browserName = "Microsoft Internet Explorer";
      this._fullVersion = this._userAgent.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = this._userAgent.indexOf("Chrome")) != -1) {
      this._browserName = "Chrome";
      this._fullVersion = this._userAgent.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = this._userAgent.indexOf("Safari")) != -1) {
      this._browserName = "Safari";
      this._fullVersion = this._userAgent.substring(verOffset + 7);
      if ((verOffset = this._userAgent.indexOf("Version")) != -1) {
        this._fullVersion = this._userAgent.substring(verOffset + 8);
      }
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = this._userAgent.indexOf("Firefox")) != -1) {
      this._browserName = "Firefox";
      this._fullVersion = this._userAgent.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if ( (nameOffset = this._userAgent.lastIndexOf(' ') + 1) < (verOffset = this._userAgent.lastIndexOf('/')) ) {
      this._browserName = this._userAgent.substring(nameOffset,verOffset);
      this._fullVersion = this._userAgent.substring(verOffset + 1);
      if (this._browserName.toLowerCase()==this._browserName.toUpperCase()) {
        this._browserName = navigator.appName;
      }
    }
    // trim the this._fullVersion string at semicolon/space if present
    if ((index=this._fullVersion.indexOf(";")) != -1) {
      this._fullVersion = this._fullVersion.substring(0, index);
    }
    if ((index=this._fullVersion.indexOf(" ")) != -1) {
      this._fullVersion = this._fullVersion.substring(0, index);
    }

    this._majorVersion = parseInt('' + this._fullVersion, 10);
    if (isNaN(this._majorVersion)) {
      this._fullVersion  = '' + parseFloat(navigator.appVersion);
      this._majorVersion = parseInt(navigator.appVersion, 10);
    }
  }

  /**
   * @returns browser user agent
   */
  get userAgent(): string {
    return this._userAgent;
  }

  /**
   * @returns browser name string
   */
  get browserName(): string {
    return this._browserName;
  }

  /**
   * @returns browser version string
   */
  get fullVersion(): string {
    return this._fullVersion;
  }

  /**
   * @returns browser major version number
   */
  get majorVersion(): number {
    return this._majorVersion;
  }
}

export default new BrowserDetector();
