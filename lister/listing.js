/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */

var habitable = habitable || {};


habitable.listing = (function (ns, core, $) {
    "use strict";

    var subclasses = core.klass.subclasses;

    ns.snippets = {};

    ns.snippets.EMPTY = String() +
        '<div class="listwidget compact">' +
        '  <div class="listcontrol">' +
        '   <div class="toggle-switch">' +
        '    <a href="javascript:void(0)"' +
        '       class="toggle-button"' +
        '       title="Click to expand listing"' +
        '       tabindex="99">&#x25BA;</a>' +
        '   </div>' +
        '  </div>' +
        '  <ul class="list-chooser">' +
        '    <li class="search">' +
        '        <input tabindex="99"' +
        '               type="text"' +
        '               placeholder="Input search term or value" />' +
        '    </li>' +
        '  </ul>' +
        '  <div class="listing-footer"></div>' +
        '</div>';

    ns.snippets.ITEM = String() +
        '<li tabindex="99">' +
        '    <div class="term-actions">' +
        '        <a class="remove-term"' +
        '           href="javascript:void(0)"' +
        '           tabindex="99"' +
        '           title="Remove">&times;</a>' +
        '    </div>' +
        '    <input class="list-element" type="hidden" id="IDHERE"' +
        '           name="IDHERE:list" />' +
        '    <label for="IDHERE">Item title</label>' +
        '    <div class="details"></div>' +
        '</li>';

    ns.TRIANGLE_H = '&#x25BA;';
    ns.TRIANGLE_V = '&#x25BC;';

    // helper functions, misc:

    ns.fn = {};

    ns.fn.widgetListItems = function (display) {
        return $('ul.list-chooser li', this.display).not('.search');
    };

    ns.ListItem = function ListItem(name, uid, data) {

        this.properties = new core.proptools.PropertyObservable(this);

        Object.defineProperties(
            this,
            {
                // ContentNode provides:
                //  * title, description
                // fields specific to ListItem, not provided by ContentNode:
                detail: this.properties.proxy('detail')
            }
        );

        this.init = function (name, uid, data) {
            ns.ListItem.prototype.init.call(this, name, uid, data);
        };

        this.init(name, uid, data);

    };
    ns.ListItem.prototype = new core.content.ContentNode();
    ns.ListItem.prototype.constructor = ns.ListItem;

    // Listing is ordered container of ListItems
    ns.Listing = function (iterable) {

        //this.properties = new core.proptools.PropertyObservable(this);

        this.init = function (iterable) {
            ns.Listing.prototype.init.call(this, iterable);
        };

        // enforce key, value types on set
        this.set = function (key, value) {
            if (!(core.id.isUUID(key))) {
                throw new Error('Key is not RFC 4122 UUID representation');
            }
            if (!(value instanceof ns.ListItem)) {
                throw new Error('Value not list item.');
            }
            ns.Listing.prototype.set.call(this, key, value);
            value.__parent__ = this;
            value.name = key;
        };

        // create(): create a new list item, not yet added
        this.create = function (uid, data) {
            return new ns.ListItem(null, uid, data);
        };

        // add() is convenience to extract key from value, add to container:
        this.add = function (item, data) {
            var key;
            if (item === undefined) {
                item = this.create(null, data);
            } else if (core.id.isUUID(item)) {
                item = item.create(item, data);  // create by passed uid
            }
            key = item.UID();
            this.set(key, item);
            return item;
        };

        this.init(iterable);

    };
    ns.Listing.prototype = new core.container.OrderedContainer();
    ns.Listing.prototype.constructor = ns.Listing;

    // Views multi-adapt content, display (jQuery-wrapped DOM context)

    ns.BaseView = function (context, display) {
        this.init = function (context, display) {
            this.context = context;
            this.bindDisplay(display);
            if (context.observers) {
                context.observers.push(this);
            }
        };

        this.isReady = function () {
            return (this.display !== null);
        };

        this.bindDisplay = function (display) {
            if (!(display instanceof $ || display instanceof HTMLElement)) {
                msg = 'Bound display must be jQuery or HTMLElement object';
                throw new Error(msg);
            }
            this.display = $(display);
        };
    };


    /* ListItemView: adapts ListItem, display contexts */
    ns.ListItemView = function (context, display) {

        // update() should sync view state from model, may
        // optionally be called with an event.
        this.update = function (event) {
            console.log('ListItemView update', this, event);
            console.log(event);
        };

        this.provides = function (attrName) {
            return false;  // default, do not proxy attribute access to this
        };

        this.init(context, display);
    };
    subclasses(ns.ListItemView, ns.BaseView);

    ns.ListingView = function (context) {

        // update() should sync view state from model, may
        // optionally be called with an event.
        this.update = function (event) {
            if (!this.isReady()) {
                return;
            }
            console.log('ListingView update');
            console.log(event);
        };

        this.provides = function (attrName) {
            return false;  // default, do not proxy attribute access to this
        };

        this.init(context, display);

    };
    subclasses(ns.ListingView, ns.BaseView);

    // Widgets construct views, elements from DOM [+data]:
    ns.ListingWidget = function ListingWidget (display) {

        // load from Array of object-per-list-item
        this.loadFromData = function (data) {
            if (!(data instanceof Array)) {
                return;
            }
            data.forEach(function (itemData) {
                var item = this.context.add();
                item.load(itemData);
            }, this);
        };

        this._itemFromLI = function (li) {
            var uid = li.attr('id'),
                item = this.context.add(uid);
            // TODO: create item view, bound to listing?
            // TODO: more metadata;
        };

        this.loadfromDOM = function () {
            var self = this,
                itemNodes = ns.fn.widgetListItems(this.display),
                uids = itemNodes.map(function (idx) {
                    var node = $(this);
                    return node.attr('id');
                });
        };

        this.init = function (display, data) {
            this.context = new ns.Listing();
            this.display = display;
            this.view = new ns.ListingView(this.context, this.display);
            this.loadFromDOM();
            if (data !== undefined) {
                this.loadFromData(data);
            }
        };

        this.init(display);

    };


    return ns;

}(habitable.listing || {}, habitable, jQuery));

$(document).ready(function () {
    var div = $('div.listWidget'),
        listing = new habitable.listing.Listing(),
        item = new habitable.listing.ListItem(),
        item2 = new habitable.listing.ListItem();
    console.log(item.observers, item2.observers);
    item.title = 'Hello';
    console.log(item.title, item2.title);
    item2.title = 'Goodbye';
    console.log(item.title, item2.title);
    console.log(item, item2);
    //listing.widget.bindElement(div);
    listing.add(item);
    console.log(item.__parent__);
    item.title = 'This old title';
    console.log(listing.values()[0].observers);
    item.detail = 'Another thing, here, again';
    item2.detail = 'Not the same thing';
    console.log(item, item2);
    listing.delete(listing.keys()[0]);
});
