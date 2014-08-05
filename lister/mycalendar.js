// mycalendar.js is demo fixture for habitable

/*jshint browser: true, nomen: false, eqnull: true, trailing:true */
/* global habitable, console */

var mycalendar = (function (ns, core) {
    "use strict";

    var schema = core.schema,
        Schema = schema.Schema;

    ns.ICalendarEvent = new Schema({
        // properties:
        title: new schema.Text({
            title: 'Title',
            description: 'The readable name of the item.',
            constraint: function (v) { return v && v.length > 3; }
        }),
        start: new schema.Date({
            title: 'Start date, time',
            defaultFactory: function () { return new Date(); }
        }),
        end: new schema.Date({
            title: 'End date, time',
            required: false
        }),
        // methods:
        getDuration: function () {
            'Computed duration, in seconds';
        },
        // invariants:
        invariants: [
            function (data) {
                if (data.start && data.end) {
                    if (data.start.valueOf() > data.end.valueOf()) {
                        throw new schema.Invalid(
                            'Start cannot be after end date.'
                        );
                    }
                }
            }
        ],
        // fieldsets are the mechanism to control order, grouping:
        fieldsets: [
            {
                name: 'Content',
                fields: ['title']
            },
            {
                name: 'Dates',
                fields: ['start', 'end']
            }
        ]
    });

    ns.CalendarEvent = function (data) {
        schema.provides(this, ns.ICalendarEvent);

        this.getDuration = function () {
            if (!this.start && !this.end) {
                return null;
            }
            if (this.start && !this.end) {
                return Infinity;
            }
            return (this.end.valueOf() - this.start.value()) / 1000;  // ms->sec
        };

        // update() would usually be provided by some content superclass,
        // but here for demonstration purposes...
        this.update = function (data) {
            // validate incoming data against invariants
            schema.allInvariants(this).forEach(function (fn) { fn(data); });
            // validate each property:
            Object.keys(data).forEach(function (name) {
                schema.validate(this, name, data[name]);
            }, this);
            // set each property
            Object.keys(data).forEach(function (name) {
                this[name] = data[name];
            }, this);
        };

        if (data) {
            this.update(data);
        }
    };

    ns.END_OF_THE_WORLD = new ns.CalendarEvent({
        title: 'Doomsday',
        start: new Date()
    });

    console.log(ns.ICalendarEvent.providedBy(ns.END_OF_THE_WORLD));  // true
    console.log(ns.ICalendarEvent.getFieldNames());

    return ns;

}(mycalendar || {}, habitable));

