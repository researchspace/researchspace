var Kefir = require("kefir");
function streamingHttp(method, url, data, headers, withCredentials) {
    var xhr = new XMLHttpRequest();
    return Kefir.stream(function (emitter) {
        var numberOfCharsAlreadyGivenToCallback = 0;
        var stillToSendStartEvent = true;
        function handleProgress() {
            var textSoFar = xhr.responseText, newText = textSoFar.substr(numberOfCharsAlreadyGivenToCallback);
            if (newText) {
                emitter.emit(newText);
            }
            numberOfCharsAlreadyGivenToCallback = textSoFar.length;
        }
        if ('onprogress' in xhr) {
            xhr.onprogress = handleProgress;
        }
        xhr.onreadystatechange = function () {
            switch (xhr.readyState) {
                case 4:
                    var successful = String(xhr.status)[0] == '2';
                    if (successful) {
                        handleProgress();
                        emitter.end();
                    }
                    else {
                        emitter.error(errorReport(xhr));
                    }
            }
        };
        try {
            xhr.open(method, url, true);
            for (var headerName in headers) {
                if (headerName) {
                    xhr.setRequestHeader(headerName, headers[headerName]);
                }
            }
            xhr.withCredentials = withCredentials;
            xhr.send(data);
        }
        catch (e) {
            window.setTimeout(function () { return emitter.error(errorReport(xhr, e)); }, 0);
        }
        return function () {
            abort(xhr);
        };
    });
}
function errorReport(xhr, exception) {
    return {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
        exception: exception,
    };
}
function abort(xhr) {
    xhr.onreadystatechange = null;
    xhr.abort();
}
module.exports = streamingHttp;
