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

/**
 * @author Alexey Morozov
 */
export class WrappingError extends Error {
  readonly innerError: any;

  constructor(message: string, innerError: any) {
    super(WrappingError.formatMessage(message, innerError));
    this.innerError = innerError;
    Object.setPrototypeOf(this, WrappingError.prototype);
    if (Error.captureStackTrace) {
      // if not IE
      Error.captureStackTrace(this, WrappingError);
    } else {
      this.stack = new Error().stack;
    }
  }

  static formatMessage(message: string, innerError?: any) {
    const innerMessage = innerError ? innerError.message : undefined;
    return message + (innerMessage ? (': \n' + innerMessage) : '');
  }
}
