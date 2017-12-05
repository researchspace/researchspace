/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

// <reference path="../../../../../typings/tsd.d.ts" />
// see https://github.com/jimhigson/oboe.js/blob/master/src/streamingHttp.browser.js

import Kefir = require('kefir');


/**
 * A wrapper around the browser XmlHttpRequest object that raises an
 * event whenever a new part of the response is available.
 *
 * In older browsers progressive reading is impossible so all the
 * content is given in a single call. For newer ones several events
 * should be raised, allowing progressive interpretation of the response.
 *
 * @param {Function} oboeBus an event bus local to this Oboe instance
 * @param {XMLHttpRequest} xhr the xhr to use as the transport. Under normal
 *          operation, will have been created using httpTransport() above
 *          but for tests a stub can be provided instead.
 * @param {String} method one of 'GET' 'POST' 'PUT' 'PATCH' 'DELETE'
 * @param {String} url the url to make a request to
 * @param {String|Null} data some content to be sent with the request.
 *                      Only valid if method is POST or PUT.
 * @param {Object} [headers] the http request headers to send
 * @param {boolean} withCredentials the XHR withCredentials property will be
 *    set to this value
 */
function streamingHttp(method, url, data, headers, withCredentials) {
  var xhr = new XMLHttpRequest();
  return Kefir.stream(emitter => {

    var numberOfCharsAlreadyGivenToCallback = 0;
    var stillToSendStartEvent = true;

    // inputBus.filter(
    //   x => x == 'ABORTING'
    // ).onValue(abort);

    /**
     * Handle input from the underlying xhr: either a state change,
     * the progress event or the request being complete.
     */
    function handleProgress() {
      var textSoFar = xhr.responseText,
      newText = textSoFar.substr(numberOfCharsAlreadyGivenToCallback);

      /*
         Raise the event for new text.

         On older browsers, the new text is the whole response.
         On newer/better ones, the fragment part that we got since
         last progress.
      */
      if (newText) {
        emitter.emit(newText);
      }
      numberOfCharsAlreadyGivenToCallback = textSoFar.length;
    }


    if ('onprogress' in xhr) {  // detect browser support for progressive delivery
      xhr.onprogress = handleProgress;
    }

    xhr.onreadystatechange = function() {

      // function sendStartIfNotAlready() {
      //   // Internet Explorer is very unreliable as to when xhr.status etc can
      //   // be read so has to be protected with try/catch and tried again on
      //   // the next readyState if it fails
      //   try{
      //     stillToSendStartEvent && oboeBus( HTTP_START ).emit(
      //       xhr.status,
      //       parseResponseHeaders(xhr.getAllResponseHeaders()) );
      //     stillToSendStartEvent = false;
      //   } catch(e){/* do nothing, will try again on next readyState*/}
      // }

      switch ( xhr.readyState ) {

        // case 2: // HEADERS_RECEIVED
        // case 3: // LOADING
        //   return sendStartIfNotAlready();

      case 4: // DONE
        //      sendStartIfNotAlready(); // if xhr.status hasn't been available yet, it must be NOW, huh IE?
        // is this a 2xx http code?
        var successful = String(xhr.status)[0] == '2';

        if ( successful ) {
          // In Chrome 29 (not 28) no onprogress is emitted when a response
          // is complete before the onload. We need to always do handleInput
          // in case we get the load but have not had a final progress event.
          // This looks like a bug and may change in future but let's take
          // the safest approach and assume we might not have received a
          // progress event for each part of the response
          handleProgress();
          emitter.end();
        } else {
          emitter.error(
            errorReport(xhr)
          );
        }
      }
    };

    try {
      xhr.open(method, url, true);

      for (var headerName in headers) {
        if (headerName) { xhr.setRequestHeader(headerName, headers[headerName]); }
      }

      // if(!isCrossOrigin(window.location, parseUrlOrigin(url))) {
      //   xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      // }
      xhr.withCredentials = withCredentials;
      xhr.send(data);
    } catch (e) {

      // To keep a consistent interface with Node, we can't emit an event here.
      // Node's streaming http adaptor receives the error as an asynchronous
      // event rather than as an exception. If we emitted now, the Oboe user
      // has had no chance to add a .fail listener so there is no way
      // the event could be useful. For both these reasons defer the
      // firing to the next JS frame.
      window.setTimeout(
        () => emitter.error(errorReport(xhr, e)), 0
      );
    }

    return () => {
      abort(xhr);
    };
  });
}

function errorReport(xhr, exception?: string) {
  return {
    status: xhr.status,
    statusText: xhr.statusText,
    responseText: xhr.responseText,
    exception: exception,
  };
}

function abort(xhr) {
  // if we keep the onreadystatechange while aborting the XHR gives
  // a callback like a successful call so first remove this listener
  // by assigning null:
  xhr.onreadystatechange = null;
  xhr.abort();
}

export = streamingHttp;
