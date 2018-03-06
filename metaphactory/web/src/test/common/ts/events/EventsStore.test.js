Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var events_1 = require("platform/api/events");
describe('EventStore', function () {
    beforeEach(function () {
        for (var x in events_1._subscribers) {
            if (x) {
                delete events_1._subscribers[x];
            }
        }
    });
    it('listen to events of specific type', function (done) {
        var SOME_EVENT_TYPE = 'SOME_EVENT_TYPE';
        events_1.listen({ eventType: SOME_EVENT_TYPE }).onValue(function (event) {
            chai_1.expect(event.eventType).to.be.equal(SOME_EVENT_TYPE);
            done();
        });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', source: '1' });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '2' });
        events_1.trigger({ eventType: SOME_EVENT_TYPE, source: '3' });
    });
    it('listen to events triggered by specific source', function (done) {
        events_1.listen({ source: '1' }).onValue(function (event) {
            chai_1.expect(event.source).to.be.equal('1');
            done();
        });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', source: '1' });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '2' });
    });
    it('listen to events triggered to specific target', function (done) {
        events_1.listen({ target: '1' }).onValue(function (event) {
            chai_1.expect(event.source).to.be.equal('3');
            done();
        });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', source: '2' });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '3' });
    });
    it('listen to events specified by complex filter', function (done) {
        events_1.listen({ eventType: 'SOME_EVENT_TYPE', target: '1', source: '2' }).onValue(function (event) {
            chai_1.expect(event.source).to.be.equal('2');
            chai_1.expect(event.targets).to.be.deep.equal(['1']);
            done();
        });
        events_1.trigger({ eventType: 'SOME_EVENT_TYPE', source: '2', targets: ['5'] });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '3' });
        events_1.trigger({ eventType: 'SOME_EVENT_TYPE', source: '2', targets: ['1'] });
    });
    it('listen to all events', function (done) {
        var i = 0;
        events_1.listen({}).onValue(function (event) {
            i = i + 1;
            if (i === 2) {
                done();
            }
        });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', source: '2' });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '3' });
    });
    it('multiple listeners', function (done) {
        var i = 0;
        var SOME_EVENT_TYPE = 'SOME_EVENT_TYPE';
        events_1.listen({ eventType: SOME_EVENT_TYPE }).onValue(function (event) {
            chai_1.expect(event.eventType).to.be.equal(SOME_EVENT_TYPE);
            i = i + 1;
            if (i === 2) {
                done();
            }
        });
        events_1.listen({ eventType: SOME_EVENT_TYPE }).onValue(function (event) {
            chai_1.expect(event.eventType).to.be.equal(SOME_EVENT_TYPE);
            i = i + 1;
            if (i === 2) {
                done();
            }
        });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', source: '1' });
        events_1.trigger({ eventType: 'SOME_OTHER_EVENT_TYPE', targets: ['1'], source: '2' });
        events_1.trigger({ eventType: SOME_EVENT_TYPE, source: '3' });
    });
});
