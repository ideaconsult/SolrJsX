/** SolrJsX library - a neXt Solr queries JavaScript library.
  *
  * Parameter management skills. Primary based on this description:
  * http://yonik.com/solr-json-request-api/#Smart_merging_of_multiple_JSON_parameters
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/** This is directly copied from AjaxSolr.
  */  
Solr.escapeValue = function (value) {
  // If the field value has a space, colon, quotation mark or forward slash
  // in it, wrap it in quotes, unless it is a range query or it is already
  // wrapped in quotes.
  if (typeof value !== 'string')
    value = value.toString();
    
  if (value.match(/[ :\/"]/) && !value.match(/[\[\{]\S+ TO \S+[\]\}]/) && !value.match(/^["\(].*["\)]$/)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return value;
};

Solr.escapeField = function (field) {
  return field.replace(/\s/g, "\\$&");  
};

/**
* Parameter specification: https://cwiki.apache.org/confluence/display/solr/Local+Parameters+in+Queries
*/
Solr.parseParameter = function (str) {
  var param = { },
      parse = str.match(/^([^=]+)=(?:\{!([^\}]*)\})?(.*)$/);
  if (parse) {

    if (parse[2] != null) {
      var matches;
      while (matches = /([^\s=]+)=?(\S*)?/g.exec(parse[2])) {
        if (param.domain === undefined)
          param.domain = {};
        if (matches[2] == null)
          param.domain['type'] = matches[1];
        else
          param.domain[matches[1]] = matches[2];
        parse[2] = parse[2].replace(matches[0], ''); // Safari's exec seems not to do this on its own
      }
    }

    param.name = parse[1];
    var arr = parse[3].split(",");
    param.value = arr.length > 1 ? arr : parse[3];
  }
  
  return param;
};

Solr.Configuring = function (settings) {
  // Now make some reformating of initial parameters.
  this.parameterHistory = [];
      
  a$.extend(true, this, a$.common(settings, this));
  
  this.resetParameters();
  this.mergeParameters(settings && settings.parameters);
};

var paramIsMultiple = function (name) { 
  return name.match(/^(?:bf|bq|facet\.date|facet\.date\.other|facet\.date\.include|facet\.field|facet\.pivot|facet\.range|facet\.range\.other|facet\.range\.include|facet\.query|fq|fl|json\.query|json\.filter|group\.field|group\.func|group\.query|pf|qf|stats\.field)$/);
};

Solr.Configuring.prototype = {
  /** Add a parameter. If `name` is an object - it is treated as a prepared
    * parameter and `value` and `domain` are ignored.
    */
  addParameter: function (param, value, domain) {
    var name;
    
    if (typeof param !== 'object') {
      name = param;
      param = { 'name': param, 'value': value };
      if (domain != null)
        param.domain = domain;
    }
    else
      name = param.name;
    
    if (paramIsMultiple(name)) {
      if (this.parameterStore[name] === undefined)
        this.parameterStore[name] = [ param ];
      else {
        var found = false;
        a$.each(this.parameterStore[name], function (p) { found = found || a$.equal(true, param, p); });
        if (!found)
          this.parameterStore[name].push(param);
        else
          return false;
      }
    }
    else
      this.parameterStore[name] = param;
      
    return param;
  },
  
  /** Find all parameters matching the needle - it can be RegExp, string, etc.
    * Always returns an array of indices - it could be empty, but is an array.
    */
  findParameters: function (name, needle) {
    var indices = [],
        filter;
    if (this.parameterStore[name] !== undefined) {
      if (typeof needle === 'function') {
        filter = function (p, i) { 
          if (needle(p, i)) 
            indices.push(i); 
        };
      }
      else if (needle == null) {
        filter = function (p, i) { indices.push(i); };
      }
      else {
        if (typeof needle !== 'object' || needle instanceof RegExp || Array.isArray(needle))
          needle = { 'value': needle };
          
        filter = function (p, i) { 
          if (a$.similar(p, needle)) 
            indices.push(i); 
        };
      } 
      
      a$.each(paramIsMultiple(name) ? this.parameterStore[name] : [ this.parameterStore[name] ], filter);
    }
    return indices;
  },
  
  /** Remove parameters. If needle is an array it is treated as an idices array,
    * if not - it is first passed to findParameters() call.
    */
  removeParameters: function (name, indices) {
    if (this.parameterStore[name] !== undefined) {
      if (typeof indices === 'number')
        indices = [ indices ];
      else if (!Array.isArray(indices))
        indices = this.findParameters(name, indices);
      
      if (!paramIsMultiple(name) || indices.length == this.parameterStore[name].length)
        delete this.parameterStore[name];
      else {
        indices.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
        // We need to traverse in reverse, relying that the indices are ascending.
        for (var i = indices.length - 1; i >= 0; --i)
          this.parameterStore[name].splice(indices[i], 1);
      }
        
      return indices.length;
    }
    else
      return false;
  },
  
  /** Returns a parameter or an array of parameters with that name
    */
  getParameter: function (name, index) {
    var multi = paramIsMultiple(name);

    if (this.parameterStore[name] === undefined)
      return multi && index == null ? [] : { 'name': name };
    else
      return (index == null || !multi) ? this.parameterStore[name] : this.parameterStore[name][index];
  },
  
  /** Returns an array of values of all parameters with given name
    */
  getAllValues: function (name) {
    var val = null;
    if (this.parameterStore[name] !== undefined)
      val = !paramIsMultiple(name) ? this.parameterStore[name].value : this.parameterStore[name].map(function (p) { return p.value; });

    return val;
  },

  /**
   * Exports the parameters with given names in the format that {@see importParameters} can use directly.
   * @param {Array<String>} names The list of parameter names to be exported.
   * @param {Function} cb An optional callback for custom formatting of each parameter.
   */
  exportParameters: function (names, cb) {
    var state = {},
      store = this.parameterStore;

    a$.each(names, function (one) {
      if (!store[one])
        ;
      else if (typeof cb === 'function')
        state[one] = cb(one, store[one]);
      else
        state[one] = store[one];
    })

    return state;
  },

  /**
   * Import the state of parameters, as exported via {@see exportParameters}.
   * @param {Object} state The parameter state to be merged into the parameters' store.
   */
  importParameters: function (state) {
    this.parameterStore = a$.extend(this.parameterStore, state);
  },
  
  /** Merge the parameters from the given map into the current ones
    */
  mergeParameters: function (parameters) {
    var self = this;
    a$.each(parameters, function (p, name) {
      if (typeof p === 'string')
        self.addParameter(Solr.parseParameter(name + '=' + p));
      else 
        self.addParameter(name, p);
    });
  },
  
  /** Iterate over all parameters - including array-based, etc.
    */
  enumerateParameters: function (deep, callback) {
    if (typeof deep !== 'boolean') {
      callback = deep;
      deep = true;
    }
    a$.each(this.parameterStore, function (p) {
      if (deep && Array.isArray(p))
        a$.each(p, callback);
      else if (p !== undefined)
        callback(p);
    });
  },
  
  /** Clears all the parameter store
    */
  resetParameters: function () {
    this.parameterStore = {};
  },
  
  /** Saves the current set of parameters and "opens" a new one, 
    * depending on the argument:
    *
    * @param {Boolean|Oblect} copy  If it is an object - uses it directly as a new parameter store,
    *                               if it is a boolean - determines whether to keep the old one.
    */
  pushParameters: function(copy) {
    this.parameterHistory.push(this.parameterStore);
    if (typeof copy === "object")
      this.parameterStore = copy;
    else if (copy === false)
      this.parameterStore = {};
    else
      this.parameterStore = a$.extend(true, {}, this.parameterStore);
  },
  
  /** Pops the last saved parameters, discarding (and returning) the current one.
    */
  popParameters: function () {
    var ret = this.parameterStore;
    this.parameterStore = this.parameterHistory.pop();
    return ret;
  }
};
