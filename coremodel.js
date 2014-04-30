/*jshint browser: true, nomen: false, eqnull: true, es5:true, trailing:true */

// coremodel namespace; can be overridden prior to loading
var COREMODELNS = 'coremodel';  // global ns, can be 

self[COREMODELNS] = (function ($, core) {
    "use strict";

    // coremodel.id module:
    core.id = (function (ns) {

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

        // setUID
        ns.setUID = function setUID(context, v) {
            context._uid = v;
        };

        return ns;

    }(core.id || {}));

    core.klass = (function (ns) {

        /* jshint newcap:false,proto:true */

        ns.subclasses = function subclasses(cls, base) {
            cls.prototype = new base();
            cls.prototype.superclass = base;
            cls.prototype.constructor = cls;
        };

        ns.prototypeFor = function (o, polyfill) {
            if (typeof Object.getPrototypeOf !== 'function' || polyfill) {
                // no ES5 support or forced use of polyfill (e.g. testing)
                if (typeof ''.__proto__ === 'object') {
                    return o.__proto__;
                }
                return o.constructor.prototype;
            }
            return Object.getPrototypeOf(o);
        };

        ns.get = function base(o) {
            o = (typeof(o) === 'function') ? new o() : o;
            return ns.prototypeFor(o).constructor;
        };

        ns.base = function base(o) {
            o = (typeof(o) === 'function') ? new o() : o;
            return ns.prototypeFor(o).superclass || null;
        };

        /**
         * classes, only that are explicitly using this framework,
         * e.g. does not include Object.
         */
        ns.all = function bases(o) {
            var ctor = ns.get(o),
                base = ns.base(o),
                hasParent = function (obj) { return !!ns.base(obj); };
            o = (typeof(o) === 'function') ? new o() : o;
            return hasParent(o) ? [ctor].concat(ns.all(base)) : [ctor];
        };

        return ns;

    }(core.klass || {}));

    core.Item = function Item(id, context, target) {

        this.defaultNS = 'item';

        Object.defineProperties(
            this,
            {
                id: {
                    get: function () {
                        return core.id.getUID(this);
                    },
                    set: function (v) {
                        if (v) {
                            core.id.setUID(this, v);
                            return;
                        }
                        throw new Error('Empty UID cannot be set');
                    }
                },
                namespace: {
                    get: function () {
                        return this._ns || this.defaultNS;
                    },
                    set: function (v) {
                        if (v) {
                            this._ns = v;
                            return;
                        }
                        throw new Error('Empty namespace is not permitted');
                    }
                },
                targetId: {
                    // computed, read-only property
                    get: function () {
                        return this.namespace + '/' + this.id;
                    },
                    set: function () {}
                }
            }
        );

        this.init = function (id, context, target) {
            this.id = id || core.id.uuid4();
            this.observers = [];
            this.context = context || null;
            this.target = target || null;
        };

        // pre/post sync hooks for use by subclases:
        this.preSync = function (observed) {};
        this.postSync = function (observed) {};
        this.syncTarget = function (observed) {};

        this.sync = function (observed) {
            this.preSync(observed);
            if (this.context && this.context.sync) {
                this.context.sync(this);
            }
            this.observers.forEach(function (component) {
                component.sync(this);
            });
            this.postSync(observed);
            if (this.target) {
                this.syncTarget(observed);
            }
        };

        this.init(id, context, target);
    };

    /**
     * ContainerOrder: adapter for ordering a container.
     */
    core.ContainerOrder = function ContainerOrder(context, keysAttr) {

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

        // Notify context that it has changed
        this._notify = function (key, fromIdx, toIdx, action) {
            context.onReorder();
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

    /**
     * Container: mapping of identified components (usually 
     *            keyed by UUID.  Orderable via this.order.
     */
    core.Container = function Container(kwargs) {

        this.init = function (kwargs) {
            var args = kwargs || {},
                uid = args.id || core.id.assignUID(this),
                iterable = args.iterable || [];
            this._keys = [];
            this._values = {};
            this.order = new core.ContainerOrder(this, '_keys');
            if (iterable && iterable.length) {
                iterable.forEach(function (pair) {
                    this._values[pair[0]] = pair[1];
                    this._keys.push(pair[0]);
                }, this);
            }
            core.Container.prototype.init.apply(
                this,
                [
                    uid,
                    args.context,
                    args.target
                ]
            ); // superclass init
        };

        // basic hooks, likely overridden by subclasses, which should
        // also by convention call this.sync():
        this.afterAdd = function (key, value) {
            this.sync();
        };

        this.afterDelete = function (key, value) {
            this.sync();
        };

        this.onReorder = function () {
            this.sync();
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
                this.afterAdd(key, value);
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
            this.afterDelete(key, value);
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

        this.init(kwargs);
    };
    core.klass.subclasses(core.Container, core.Item);

    return core;

}(jQuery, self[COREMODELNS] || {}));

