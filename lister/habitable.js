/** habitable.js : a small containement model framework for JavaScript (ES5).
  *
  *  -- Because your stuff has to live somewhere!
  *
  * Copyright (c) 2013 The University of Utah
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  * THE SOFTWARE.
  *
  * --
  *
  * Author: Sean Upton <sean.upton@hsc.utah.edu>
  */

/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */

var habitable = habitable || {};

habitable.id = (function (ns, core) {

    // uuid function via http://stackoverflow.com/a/2117523/835961
    ns.uuid4_tmpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    ns.uuid4 = function () {
        return ns.uuid4_tmpl.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    ns.isUUID = function (uid) {
        return (
            typeof uid === 'string' &&
            uid.length === 36 &&
            uid.replace((/-/g),'').length === 32
        );
    };

    // assign UID, if not already assigned; then return:
    ns.assignUID = function (context) {
        if (!(context.hasOwnProperty('_uid') && context._uid)) {
            context._uid = ns.uuid4();
        }
        return context._uid;
    };

    // getUID adapter/fn returns UID string for object
    ns.getUID = function getUID(context) {
        return context._uid;
    };

    return ns;

}(habitable.id || {}, habitable));


habitable.klass = (function (ns, core) {
    "use strict";

    /* jshint newcap:false */

    ns.subclasses = function subclasses(cls, base) {
        cls.prototype = new base();
        cls.prototype.superclass = base;
        cls.prototype.constructor = cls;
    };

    ns.bases = function bases(o) {
        var ctor,
            hasParent = function (o) { return Boolean(o.superclass); };
        o = (typeof(o) === 'function') ? new o() : o;
        ctor = o.constructor;
        return hasParent(o) ? [ctor].concat(ns.bases(o.superclass)) : [];
    };

    return ns;

}(habitable.klass || {}, habitable));


habitable.lifecycle = (function (ns, core) {
    "use strict";

    /* Object lifecycle event objects for added/modify/delete events.
     *  Such events may be used either by simple observed/observer
     *  objects tightly coupled (e.g. view->model->storage) or by
     *  any kind of loose-coupled publish/subscribe framework.
     */

    var subclasses = core.klass.subclasses,
        bases = core.klass.bases;

    ns.ObjectEvent = function ObjectEvent(object, data) {
        this.name = 'Object event';
        this.object = object;
        // data may be an object describing one, or possibly more changes:
        this.data = (!(data instanceof Array)) ? [data] : data;
    };

    // ObjectModifiedEvent: called on object modification, with optional
    //                      description of one or more changes
    ns.ObjectModifiedEvent = function ObjectModifiedEvent(object, data) {
        ns.ObjectEvent.call(this, object, data);
        this.name = 'Object modified';
    };
    subclasses(ns.ObjectModifiedEvent, ns.ObjectEvent);

    // ObjectCreatedEvent: called after object is first instantiated
    ns.ObjectCreatedEvent = function ObjectCreatedEvent(object) {
        ns.ObjectEvent.call(this, object);
        this.name = 'Object created';
    };
    subclasses(ns.ObjectCreatedEvent, ns.ObjectEvent);

    // ObjectAddedEvent: object is added to a parent container/mapping
    ns.ObjectAddedEvent = function ObjectAddedEvent(object, container) {
        ns.ObjectEvent.call(this, object);
        this.name = 'Object added';
        this.container = container;
    };
    subclasses(ns.ObjectAddedEvent, ns.ObjectEvent);

    // Object is moved out of one container (possibly to another) or renamed
    ns.ObjectMovedEvent = function ObjectMovedEvent(
            object,
            oldName,
            oldContainer,
            newName,
            newContainer) {
        ns.ObjectEvent.call(this, object);
        this.name = 'Object moved';
        this.oldName = oldName;
        this.oldContainer = oldContainer;
        this.newName = newName;
        this.newContainer = newContainer;
    };
    subclasses(ns.ObjectMovedEvent, ns.ObjectEvent);

    // Object is removed from a container entirely:
    ns.ObjectRemovedEvent = function ObjectRemovedEvent(
            object,
            name,
            container) {
        ns.ObjectMovedEvent.call(this, object, name, container);
        this.name = 'Object removed';
    };
    subclasses(ns.ObjectRemovedEvent, ns.ObjectMovedEvent);

    // Container is modified (e.g. items re-ordered):
    ns.ContainerModifiedEvent = function ContainerModifiedEvent(
            object,
            data) {
        ns.ObjectModifiedEvent.call(this, object, data);
        this.name = 'Container modified';
    };
    subclasses(ns.ContainerModifiedEvent, ns.ObjectModifiedEvent);

    // default pub/sub system: EventChannel
    ns.EventChannel = function EventChannel(name) {
        this.name = name;

        /* registry of event constructor name (string) to Array of callback
         * specification wrappers that look like:
         *  {
         *      filter: function (evt) {return true;},  // may be null/undef.
         *      callback: function(evt) { console.log('do something'); }
         *  }
         */

        this.registry = {};

        /* notify(): notify the channel of an event; the event instance holds
         *  a reference to a (content/model) object in event.object.
         *
         * Note:
         *  for subscribers that filter, best-case lookup is O(N) through
         *  the space of all filters registered (this would be difficult
         *  to memoize reliably).
         */
        this.notify = function (event) {
            var eventTypes = bases(event).map(function (c) { return c.name; }),
                registry = this.registry;
            eventTypes.forEach(function (eventName) {
                var wrappers = registry[eventName];
                (wrappers || []).forEach(function (wrapper) {
                    if (wrapper.filter(evt)) {
                        wrapper.callback(evt);
                    }
                });
            });
        };

        this.matchAny = function (event) {
            return true;  // any object matches, always.
        };

        this._spec = function (spec) {
            var event = spec,
                filter = this.matchAny,
                eventName;
            if (spec instanceof Array) {
                if (!spec.length) {
                    throw new Error('Empty event specification');
                }
                event = spec[0];
                if (spec.length > 1) {
                    filter = spec[1];
                }
            }
            if (!(event instanceof ns.ObjectEvent)) {
                throw new Error('Invalid event specification');
            }
            eventName = event.constructor.name;
            return {
                event: event,
                eventName: eventName,
                filter: filter
            };
        };

        /* subscribe(): for an event(+content) specification, register a
         *  callback to be called for event on notify, as appropriate.
         *
         * spec is either an event object or an array of event and optional
         *  filter callable; if no filter, all objects for events passed to
         *  notify that subscribe to the particular event will have callback
         *  called.
         */
        this.subscribe = function (spec, callback) {
            var registry = this.registry;
            spec = this._spec(spec);
            registry[spec.eventName] = registry[spec.eventName] || [];
            this.unsubscribe(spec, callback);  // prevents duplicate reg.
            this.registry[spec.eventName].push(
                {
                    filter: spec.filter,
                    callback: callback
                }
            );
        };

        this.unsubscribe = function (spec, callback) {
            var registry = this.registry,
                registered,
                idx = 0,
                i,
                marked = [],  // removal indexes
                removed = 0;
            spec = this._spec(spec);
            registered = registry[spec.eventName];
            if (registered) {
                registered.forEach(function (wrapper) {
                    if (wrapper.filter === spec.filter &&
                            wrapper.callback === spec.callback) {
                        marked.push(idx);
                    }
                    idx += 1;
                });
            }
            marked.forEach(function (idx) {
                registered.splice((idx - removed), 1);
                removed += 1;  // adjust/offset the index for count removed
            });
        };
    };

    // default (global) pub/sub channel:
    ns.eventPublisher = new ns.EventChannel('global');

    // named channels -- applications can register others as they see fit:
    ns.channels = {
        global: ns.eventPublisher
    };

    ns.addChannel = function (name) {
        if (Object.keys(ns.channels).indexOf(name) === -1) {
            ns.channels[name] = new ns.EventChannel(name);
        }
        return ns.channels[name];
    };

    return ns;

}(habitable.lifecycle || {}, habitable));


habitable.container = (function (ns, core) {
    "use strict";

    var lifecycle = core.lifecycle;

    // ContainerOrder: adapter for a container keyed/ordered with an Array
    ns.ContainerOrder = function ContainerOrder(context, keysAttr) {
        this.context = context;
        this._attr = keysAttr || '_keys';

        Object.defineProperties(
            this,
            {
                keys: {
                    get: function () {
                        return this.context[this._attr];
                    },
                    set: function (v) {
                        return;  // do nothing
                    },

                }
            }
        );

        this._move = function (fromIdx, toIdx) {
            this.keys.splice(toIdx, 0, this.keys.splice(fromIdx,1)[0]);
        };

        // Notify observers and event channels
        this._notify = function (key, fromIdx, toIdx, action) {
            var event = new lifecycle.ContainerModifiedEvent(
                    this.context,
                    {
                        movedKey: key,
                        fromIdx: fromIdx,
                        toIdx: toIdx,
                        action: action
                    }
                );
            context._notify(event);
        };

        this.moveUp = function (key) {
            var idx = this.keys.indexOf(key);
            if (idx > 0) {
                this._move(idx, idx - 1);
                this._notify(key, idx, idx - 1, 'move up');
            }
        };

        this.moveDown = function (key) {
            var idx = this.keys.indexOf(key);
            if (idx < this.keys.length - 1) {
                this._move(idx, idx + 1);
                this._notify(key, idx, idx - 1, 'move down');
            }
        };

        this.moveToTop = function (key) {
            var idx = this.keys.indexOf(key);
            if (idx > 0) {
                this._move(idx, 0);
                this._notify(key, idx, 0, 'move to top');
            }
        };

        this.moveToBottom = function (key) {
            var idx = this.keys.indexOf(key),
                destIdx = this.keys.length - 1;
            if (idx < destIdx) {
                this._move(idx, destIdx);
                this._notify(key, idx, destIdx, 'move to bottom');
            }
        };
    };

    // OrderedContainer: ordered mapping with string keys; otherwise
    //                   similar calling interface to ECMAScript 6 Map
    ns.OrderedContainer = function OrderedContainer(iterable) {
        var lifecycle = core.lifecycle;

        this.init = function (iterable) {
            var uid = core.id.assignUID(this);
            this._keys = [];
            this._values = {};
            this.order = new ns.ContainerOrder(this, '_keys');
            if (iterable && iterable.length) {
                iterable.forEach(function (pair) {
                    this._values[pair[0]] = pair[1];
                    this._keys.push(pair[0]);
                }, this);
            }
            // observers optionally get notified of add, delete:
            this.observers = [];
            // event channels, for this container's UID, and global channel:
            this.eventChannels = [
                core.lifecycle.addChannel(uid),
                core.lifecycle.channels.global,
            ];
            // event handler callback hooks:
            this.afterDelete = [];
            this.afterAdd = [];
        };

        // Add/remove event core:

        this._notify = function (event) {
            // Notify tightly-coupled observers:
            this.observers.forEach(function (observer) {
                observer.update(event);
            });
            // Lastly, notify relevant loosely-coupled event channels:
            this.eventChannels.forEach(function (channel) {
                channel.notify(event);
            });
        };

        this._afterAdd = function (key, value) {
            var event = new lifecycle.ObjectAddedEvent(value, this);
            // Call direct hooks first:
            (this.afterAdd || []).forEach(function (callback) {
                callback.apply(self, [key, value]);
            });
            // then notify observers and event channels:
            this._notify(event);
        };

        this._afterDelete = function (key, value) {
            var event = new lifecycle.ObjectRemovedEvent(value, key, this);
            // Call direct hooks first:
            (this.afterDelete || []).forEach(function (callback) {
                callback.apply(self, [key, value]);
            });
            // then notify observers and event channels:
            this._notify(event);
        };

        // Mapping access
        this.get = function (key) {
            return (this.has(key)) ? this._values[key] : undefined;
        };

        // Mapping set and delete
        this.set = function (key, value) {
            var isAdd = (!this.has(key));
            this._values[key] = value;
            this._keys.push(key);
            if (isAdd) {
                this._afterAdd(key, value);
            }
        };

        this.delete = function (key) {
            var idx = this._keys.indexOf(key),
                value = this.get(key);
            if (idx < 0) {
                return false;
            }
            this._keys.splice(idx, 1);
            delete this._values[key];
            this._afterDelete(key, value);
            return true;
        };

        // containment and size:

        this.has = function (key) {
            return (this._keys.indexOf(key) < 0) ? false : true;
        };

        this.size = function () {
            return this._keys.length;
        };

        // mapping enumeration:  keys(), values(), entries(), forEach()
        this.keys = function () {
            return this._keys.slice(0);  // return copy
        };

        this.values = function (fn) {
            var names = this._keys,
                valueFn = function (key, value) { return value; },
                getter;
            fn = fn || valueFn;
            getter = function (key) { return fn(key, this._values[key]); };
            return names.map(getter, this);
        };

        this.entries = function () {
            var pairFn = function(key, value) { return [key, value]; };
            return this.values(pairFn);
        };

        this.forEach = function (callback, thisArg) {
            var self = this;
            this._keys.forEach(function (key, idx, keys) {
                var value = self.get(key);
                callback.apply(
                    thisArg || this,
                    [value, key, self]
                );
            });
        };

        this.init(iterable);
    };

    return ns;

}(habitable.container || {}, habitable));


habitable.schema = (function (ns, core) {
    "use strict";

    var subclasses = core.klass.subclasses,
        bases = core.klass.bases;

    ns.PROVIDES_ATTR = '__provides__';

    ns.ValidationError = function ValidationError(message) {
        this.name = 'ValidationError';
        this.message = message;
    };
    ns.ValidationError.prototype = new Error();
    subclasses(ns.ValidationError, Error);

    ns.Invalid = function Invalid(message) {
        this.message = message;
    };
    subclasses(ns.Invalid, ns.ValidationError);

    // Generic schema field, no validation constraints
    ns.Field = function Field(options) {

        // specific field types may override these:
        this.VALUE_TYPE = null;
        this.INSTANCE_OF = null;

        this._fromOptions = function (name) {
            var self = this;
            return {
                get: function () {
                    return self.options[name];
                },
                set: function (v) {
                    self.options[name] = v;
                }
            };
        };

        Object.defineProperties(
            this,
            {
                title: this._fromOptions('title'),
                description: this._fromOptions('description'),
                constraint: this._fromOptions('constraint'),
                required: this._fromOptions('required'),
                defaultValue: this._fromOptions('defaultValue')
            }
        );

        this.init = function (options) {
            options = options || {};
            options.constraint = options.constraint || function (v) {
                return true;
            };
            this.options = options;
            if (typeof options.constraint !== 'function') {
                throw new Error('Field constrain is not callable.');
            }
            if (options.default) {
                this.validate(options.default);
            }
            // name and containining schema initially unset; set by schema
            this.__schema__ = null;
            this.name = null;
        };

        this.raise = function (msg, value) {
            throw new ns.ValidationError(msg + ': ' + value);
        };

        // validate() may throw exception
        this.validate = function (value) {
            if (this.VALUE_TYPE) {
                if (typeof value !== this.VALUE_TYPE) {
                    this.raise('Wrong value type', value);
                }
            }
            if (this.INSTANCE_OF !== null) {
                if (!(value instanceof this.INSTANCE_OF)) {
                    this.raise('Wrong value type', value);
                }
            }
            if (!(this.constraint(value))) {
                this.raise('Constraint not satisfied', value);
            }
        };

        this.init(options);
    };

    // TextLine: multi-line text field
    ns.Text = function Text(options) {
        this.VALUE_TYPE = 'string';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Text, ns.Field);

    // TextLine: single-line text field
    ns.TextLine = function Text(options) {
        this.VALUE_TYPE = 'string';  // used for validation

        this.validate = function (value) {
            ns.Text.prototype.validate.call(this, value);
            if (value.match(/[\r\n]/)) {
                throw new ns.ValidationeError('Disallowed line-break(s) text');
            }
        };

        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.TextLine, ns.Text);

    // HTML: rich-text field (marker, just text)
    ns.HTML = function (options) {
    };
    subclasses(ns.HTML, ns.Text);

    // Number field:
    ns.Number = function (options) {
        this.VALUE_TYPE = 'number';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Number, ns.Field);

    // Boolean field:
    ns.Boolean = function (options) {
        this.VALUE_TYPE = 'boolean';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Boolean, ns.Field);

    // Date field:
    ns.Date = function (options) {
        this.VALUE_TYPE = 'object';  // used for validation
        this.INSTANCE_OF = Date;
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Date, ns.Field);

    // Object field:
    ns.Object = function (options) {
        this.VALUE_TYPE = 'object';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Object, ns.Field);

    // Array field:
    ns.Array = function (options) {
        this.VALUE_TYPE = 'object';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Array, ns.Field);

    // Function (callable) field type
    ns.Function = function (options) {
        this.VALUE_TYPE = 'object';  // used for validation
        ns.Text.prototype.init.apply(this, options);
    };
    subclasses(ns.Function, ns.Field);

    ns.Schema = function Schema(fields) {

        // fieldsets, order thereof, and field order:
        this._initFieldsets = function (data, fieldnames) {
            var claimedFields = [],
                defaultFieldset = {
                    name: null,
                    title: 'Default',
                    fields: fieldnames.slice(0)
                };
            this.fieldsets = {null: defaultFieldset};
            this.groupNames = [null];
            this.fieldNames = [];  // order
            // get fieldsets from passed data/options:
            if (data.fieldsets) {
                if (data.fieldsets instanceof Array) {
                    data.fieldsets.forEach(function (fset) {
                        if (!fset.name) {
                            throw new Error('Empty or missing fieldset name');
                        }
                        this.fieldsets[fset.name] = fset;
                        this.groupNames.push(fset.name);
                    }, this);
                } else {
                    Object.keys(data.fieldsets).forEach(function (name) {
                        this.fieldsets[name] = data.fieldsets[name];
                        // note: obj notation does not maintain key order
                        this.groupNames.push((name === 'null') ? null : name);
                    }, this);
                }
            }
            // normalize each fieldset:
            Object.keys(this.fieldsets).forEach(function (name) {
                var fset = this.fieldsets[name];
                fset.__schema__ = this;
                if (fset.name === undefined) {
                    fset.name = name;
                }
                if (fset.name !== null) {
                    claimedFields = claimedFields.concat(fset.fields);
                }
                fset.title = fset.title || fset.name;
            }, this);
            // reconcile which fields are not claimed, to default fielset:
            defaultFieldset.fields = defaultFieldset.fields.filter(
                function (name) {
                    return (claimedFields.indexOf(name) === -1);
                }
            );
            // flattened field order computed at schema creation time:
            this.groupNames.forEach(function (name) {
                var fset = this.fieldsets[name];
                this.fieldNames = this.fieldNames.concat(fset.fields);
            }, this);
            // handle where some, not all default fieldset fields declared:
            fieldnames.slice(0).forEach(function (name) {
                if (this.fieldNames.indexOf(name) === -1) {
                    this.fieldsets.null.fields.push(name);
                    this.fieldNames.push(name);
                }
            }, this);
        };

        this.init = function (data) {
            var pairs = function (data) {
                    return Object.keys(data).map(function (k) {
                        return [k, data[k]];
                    });
                },
                _key = function (pair) {
                    return pair[0];
                },
                isField = function (pair) {
                    return (pair[1] instanceof ns.Field);
                },
                isMethod = function (pair) {
                    return (typeof pair[1] === 'function');
                },
                fieldnames = pairs(data || {}).filter(isField).map(_key),
                methods = pairs(data || {}).filter(isMethod);
            this._data = data;
            this.methods = {};
            this.fields = {};
            methods.forEach(function (pair) {
                this.methods[pair[0]] = pair[1];
            }, this);
            fieldnames.forEach(function (name) {
                var field = data[name];
                field.name = name;  // identifier/key set on field obj
                field.__schema__ = this;
                this.fields[name] = field;
            }, this);
            this.invariants = data.invariants || [];
            this._initFieldsets(data, fieldnames);
        };

        this.providedBy = function (context) {
            return (ns.providedBy(context).indexOf(this) !== -1);
        };

        this.directlyProvidedBy = function () {
            return (ns.directlyProvidedBy(context).indexOf(this) !== -1);
        };

        this._fieldOrder = function (fieldset) {
            var useDefault = (fieldset === null),
                useAll = (fieldset === undefined);
            if (useDefault) {
                return this.fieldsets[null].fields;
            }
            if (useAll) {
                return this.fieldNames;  // all fields
            }
            return this.fieldsets[fieldset];
        };

        this.getFieldNames = function (fieldset) {
            fieldset = (fieldset) ? fieldset.name || fieldset : fieldset;
            return this._fieldOrder(fieldset);
        };

        this.getFields = function (fieldset) {
            var names = this.getFieldNames(fieldset);
            return names.map(function (n) {
                return [n, this.fields[n]];
            }, this);
        };

        this.init(fields);
    };

    // mark context, whether an object or a prototype thereof:
    ns.provides = function (context, iface) {
        var hasProv = (context.hasOwnProperty(ns.PROVIDES_ATTR)),
            prov = (hasProv) ? context[ns.PROVIDES_ATTR] : [];
        if (prov.indexOf(iface) === -1) {
            context[ns.PROVIDES_ATTR] = prov.concat([iface]);
        }
    };

    ns.directlyProvidedBy = function (context) {
        var found;
        if (context.hasOwnProperty(ns.PROVIDES_ATTR)) {
            found = context[ns.PROVIDES_ATTR];
            if (found instanceof Array) {
                return found;
            }
        }
        return [];
    };

    ns.providedBy = function (context) {
        var result = ns.directlyProvidedBy(context);
        // check each base in prototype inheritance chain
        bases(context).forEach(function (base) {
            var p = base.prototype;
            result = result.concat(ns.directlyProvidedBy(p));
        });
        return result;
    };

    // validation functions:

    ns.validate = function (context, name, value) {
        ns.providedBy(context).forEach(function (schema) {
            var field;
            if (schema.fieldNames.indexOf(name) !== -1) {
                field = schema.fields[name];
                field.validate(value);
            }
        }, this);
    };

    ns.allInvariants = function (context) {
        var ifaces = ns.providedBy(context),
            _getInvariants = function (iface) {
                return iface.invariants;
            };
        return [].concat.apply([], ifaces.map(_getInvariants));
    };

    ns.definedFields = function (context, fieldset) {
        var result = [];
    };

    return ns;

}(habitable.schema || {}, habitable));


habitable.proptools = (function (ns, core) {
    "use strict";

    /* PropertyObservable adapter provides a contract between a model
     *  object and its observers, which may be views, storage plugins,
     *  or some combination thereof (e.g. DOM storage/manipulation).
     *
     * Usual JavaScript rules about property storage contexts apply; if 
     * you inherit one content class with another, you must declare
     * a this.properties adapter for each subclass/constructor.  As a
     * convenience, the PropertyObservable constructor will copy
     * properties from the context's prototype (superclass).
     */
    ns.PropertyObservable = function PropertyObservable(context) {

        // fallback storage for properties if no observers store for name:
        if (!context.hasOwnProperty('localProperties')) {
            context.localProperties = {};
        }
        if (!context.hasOwnProperty('delegatedProperties')) {
            context.delegatedProperties = {};
        }

        // observers notified of state change, queried for pluggable storage:
        this.observers = [];
        // cache storage assignements to delegated observer:
        //this.delegatedProperties = {};

        this.set = function (thisArg, name, value) {
            var delegated = Object.keys(thisArg.delegatedProperties),
                previousValue = (this.observers) ? this[name] : null,
                delegate;
            if (delegated.indexOf(name) !== -1) {
                delegate = thisArg.delegatedProperties[name];
                delegate[name] = value;  // set property on assigned delegate
                return;
            }
            thisArg.observers.forEach(function (observer) {
                // observers can optionally be queried for whether they handle
                // a property name via the provides() method fo the observer:
                if (observer.provides && observer.provides(name)) {
                    //  if multiple observers provide storage, all get value
                    //  saved to them; only the last one is cached for get()
                    delegate = observer;
                    thisArg.delegatedProperties[name] = delegate;
                    delegate[name] = value;
                }
            });
            // if no delegated storage, use default local properties storage:
            if (!delegate) {
                thisArg.localProperties[name] = value;
                thisArg.delegatedProperties[name] = thisArg.localProperties;
            }
            // DESIGN NOTE: notify on every property-set is fine-grained,
            // which makes notifying/updating tightly coupled observers
            // sensible, but we should not call event channels for risk
            // of notifying loosely coupled channels repeatedly on
            // modify of multiple properties.
            thisArg.observers.forEach(function (observer) {
                if (observer.update) {
                    observer.update(
                        new core.lifecycle.ObjectModifiedEvent(
                            thisArg,
                            {
                                name: name,
                                value: value,
                                previous: previousValue
                            }
                        )
                    );
                }
            });
        };

        this.get = function (thisArg, name) {
            var delegated = Object.keys(thisArg.delegatedProperties),
                delegate,
                observer,
                i;
            if (delegated.indexOf(name) !== -1) {
                delegate = thisArg.delegatedProperties[name];
                return delegate[name];
            }
            // check observers
            for (i = 0; i < thisArg.observers.length; i += 1) {
                observer = thisArg.observers[i];
                if (observer.provides && observer.provides(name)) {
                    thisArg.delegatedProperties[name] = observer;
                    return observer[name];
                }
            }
            // finally, just get the property from default storage:
            return thisArg.localProperties[name];
        };

        // ES5 definePropert(y|ies) proxy object, defines setters/getters
        this.proxy = function (name) {
            var propAdapter = this;
            return {
                // this === the instance of the content, passed to the 
                // get/set methods in order for them to support
                // prototypical inheritance
                get: function () { return propAdapter.get(this, name); },
                set: function (v) { propAdapter.set(this, name, v); }
            };
        };

        this.observerDefinition = function (context) {
            var self = this;
            return {
                get: function () {
                    return self.observers;   // mutable
                },
                set: function (v) {
                    self.observers = v;      // replaceable
                }
            };
        };

        // makes observers property available on the bound context
        this.bind = function (context) {
            Object.defineProperties(
                context,
                {
                    observers: this.observerDefinition()
                }
            );
        };

        this.bind(context);
    };


    return ns;

}(habitable.proptools || {}, habitable));


habitable.content = (function (ns, core) {
    "use strict";

    var getUID = core.id.getUID,
        assignUID = core.id.assignUID,
        events = core.lifecycle;

    // Node for contained content / model-data object, lives in containers
    ns.ContentNode = function (name, uid, data) {

        this.properties = new core.proptools.PropertyObservable(this);

        // properties subject to being observed by or proxied to
        // views/storage
        Object.defineProperties(
            this,
            {
                // Dublin Core Metadata Element set:
                title: this.properties.proxy('title'),
                description: this.properties.proxy('description')
            }
        );

        this.load = function (data) {
            if (data) {
                Object.keys(data).forEach(function (k) {
                    this[k] = data[k];
                }, this);
            }
        };

        this.init = function (name, uid, data) {
            if (uid === undefined) {
                assignUID(this);
            }
            this.load(data);
            this.name = name || this.UID();
            this.__parent__ = null;
        };

        this.UID = function () {
            return getUID(this);
        };

        this.init(name, uid, data);
    };

    return ns;

}(habitable.content || {}, habitable));


