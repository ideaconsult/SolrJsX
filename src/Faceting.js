/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Faceting skills - maintenance of appropriate parameters.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd. All rights reserved.
  */
  
/* http://wiki.apache.org/solr/SimpleFacetParameters */
var FacetParameters = {
    'prefix': null,
    'sort': null,
    'limit': null,
    'offset': null,
    'mincount': null,
    'missing': null,
    'method': null,
    'enum.cache.minDf': null
  },
  bracketsRegExp = /^\s*\(\s*|\s*\)\s*$/g,
  statsRegExp = /^([^()]+)\(([^)]+)\)$/g;

/**
  * Forms the string for filtering of the current facet value
  */
Solr.facetValue = function (value) {
  if (!Array.isArray(value))
    return Solr.escapeValue(value);
  else if (value.length == 1)
    return Solr.escapeValue(value[0]);
  else
    return "(" + value.map(function (v) { return Solr.escapeValue(v); }).join(" ") + ")";
};

/**
 * Parses a facet filter from a parameter.
 *
 * @returns {Object} { field: {String}, value: {Combined}, exclude: {Boolean} }.
 */ 
Solr.parseFacet = function (value) {
  var old = value.length, 
      sarr, brackets;
  
  value = value.replace(bracketsRegExp, "");
  brackets = old > value.length;

  sarr = value.replace(/\\"/g, "%0022").match(/[^\s:\/"]+|"[^"]+"/g);
  if (!brackets && sarr.length > 1) // we can't have multi-values without a brackets here.
    return null;

  for (var i = 0, sl = sarr.length; i < sl; ++i)
    sarr[i] = sarr[i].replace(/^"|"$/g, "").replace("%0022", '"');
  
  return sarr;
};

/** Build and add stats fields for non-Json scenario
  * TODO: This has never been tested!
  */
Solr.facetStats = function (manager, tag, statistics) {
  manager.addParameter('stats', true);
  var statLocs = {};
  
  // Scan to build the local (domain) parts for each stat    
  a$.each(statistics, function (stats, key) {
    var parts = stats.match(statsRegExp);
        
    if (!parts)
      return;
      
    var field = parts[2],
        func = parts[1],
        loc = statLocs[field];
        
    if (loc === undefined) {
      statLocs[field] = loc = {};
      loc.tag = tag;
    }
    
    loc[func] = true;
    loc.key = key; // Attention - this overrides.
  });
  
  // Finally add proper parameters
  a$.each(statLocs, function (s, f) {
    manager.addParameter('stats.field', f, s);
  });
};

Solr.Faceting = function (settings) {
  this.id = this.field = null;
  a$.extend(true, this, a$.common(settings, this));
  this.manager = null;
  
  // We cannot have aggregattion if we don't have multiple values.
  if (!this.multivalue)
    this.aggregate = false;
    
  if (!this.jsonLocation)
    this.jsonLocation = 'json.facet.' + this.id;
    
  this.facet = settings && settings.facet || {};

  this.fqRegExp = new RegExp('^-?' + Solr.escapeField(this.field).replace("\\", "\\\\") + ':([^]+)$');
};

Solr.Faceting.prototype = {
  multivalue: false,      // If this filter allows multiple values. Values can be arrays.
  aggregate: false,       // If additional values are aggregated in one filter.
  exclusion: false,       // Whether to exclude THIS field from filtering from itself.
  domain: null,           // Some local attributes to be added to each parameter
  nesting: null,          // Wether there is a nesting in the docs - a easier than domain approach.
  useJson: false,         // Whether to use the Json Facet API.
  jsonLocation: null,     // Location in Json faceting object to put the parameter to.
  domain: null,           // By default we don't have any domain data for the requests.
  statistics: null,       // Possibility to add statistics
  
  /** Make the initial setup of the manager for this faceting skill (field, exclusion, etc.)
    */
  init: function (manager) {
    a$.pass(this, Solr.Faceting, "init", manager);
    this.manager = manager;
    
    var exTag = null;

    if (!!this.nesting)
      this.facet.domain = a$.extend({ blockChildren: this.nesting }, this.facet.domain);

    if (this.exclusion) {
      this.domain = a$.extend(this.domain, { tag: this.id + "_tag" });
      exTag = this.id + "_tag";
    }

    if (this.useJson) {
      var facet = { type: "terms", field: this.field, mincount: 1 };
      
      if (!!this.statistics)
        facet.facet = this.statistics;
      
      if (exTag != null)
        facet.domain = { excludeTags: exTag };
        
      this.fqName = "json.filter";
      this.manager.addParameter(this.jsonLocation, a$.extend(true, facet, this.facet));
    }
    else {
      var self = this,
          fpars = a$.extend(true, {}, FacetParameters),
          domain = { key: this.id };
        
      if (exTag != null)
        domain.ex = exTag;
        
      this.fqName = "fq";
      this.manager.addParameter('facet', true);
      
      if (this.facet.date !== undefined) {
        this.manager.addParameter('facet.date', this.field, domain);
        a$.extend(fpars, {
          'date.start': null,
          'date.end': null,
          'date.gap': null,
          'date.hardend': null,
          'date.other': null,
          'date.include': null
        });
      }
      else if (this.facet.range !== undefined) {
        this.manager.addParameter('facet.range', this.field, domain);
        a$.extend(fpars, {
          'range.start': null,
          'range.end': null,
          'range.gap': null,
          'range.hardend': null,
          'range.other': null,
          'range.include': null
        });
      }
      // Set facet.field, facet.date or facet.range to truthy values to add
      // related per-field parameters to the parameter store.
      else {
        this.facet.field = true;
        if (!!this.statistics) {
          domain.stats = this.id + "_stats";
          Solr.facetStats(this.manager, domain.stats, this.statistics);
        }
          
        this.manager.addParameter('facet.field', this.field, domain);
      }
      
      fpars = a$.common(this.facet, fpars);
      a$.each(fpars, function (p, k) { 
        self.manager.addParameter('f.' + Solr.escapeField(self.field) + '.facet.' + k, p); 
      });
      
    }
  },
  
  /**
   * Add a facet filter parameter to the Manager
   *
   * @returns {Boolean} Whether the filter was added.
   */    

  addValue: function (value, exclude) {
    if (!this.multivalue)
      this.clearValues();

    var index;
    if (!this.aggregate || !(index = this.manager.findParameters(this.fqName, this.fqRegExp)).length)
      return this.manager.addParameter(this.fqName, this.fqValue(value, exclude), this.domain);
      
    // No we can obtain the parameter for aggregation.
    var param = this.manager.getParameter(this.fqName, index[0]),
        parsed = this.fqParse(param.value),
        added = false;
    
    if (!Array.isArray(value))
      value = [value];
    for (var v, i = 0, vl = value.length; i < vl; ++i) {
      v = value[i];
      if (parsed.indexOf(v) > -1)
        continue;

      parsed.push(v);
      added = true;
    }
    
    if (!added)
      return false;
    
    param.value = this.fqValue(parsed, exclude);
    return true;
  },
  
  /**
   * Removes a value for filter query.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */    
  removeValue: function (value) {
    if (!this.multivalue)
      return this.clearValues();
    else {
      var self = this,
          removed = false;

      this.manager.removeParameters(this.fqName, function (p) {
        var rr;

        if (!p.value.match(self.fqRegExp))
          return false;
        else if (!self.aggregate) {
          removed = removed || (rr = p.value.indexOf(Solr.facetValue(value)) >= 0);
          return rr;
        }
        
        if (!Array.isArray(value))
          value = [ value ];
        
        var parsed = self.fqParse(p.value).filter(function (v){
          if (value.indexOf(v) == -1)
            return true;
          else {
            removed = true;
            return false;
          }
        });
        
        if (!parsed.length)
          return true;
        else if (parsed.length == 1)
          parsed = parsed[0];
          
        p.value = self.fqValue(parsed);
        return false;
      });
      
      return removed;
    }
  },
  
  /**
   * Tells whether given value is part of facet filter.
   *
   * @returns {Boolean} If the given value can be found
   */      
  hasValue: function (value) {
    var indices = this.manager.findParameters(this.fqName, this.fqRegExp);
        
    for (var p, i = 0, il = indices.length; i < il; ++i) {
      p = this.manager.getParameter(this.fqName, indices[i]);
      if (this.fqParse(p.value).indexOf(value) > -1)
        return true;
    }
    
    return false;
  },
  
  /**
   * Returns all the values - the very same way they were added to the agent.
   */
  getValues: function () {
    var indices = this.manager.findParameters(this.fqName, this.fqRegExp),
        vals = [];
        
    for (var p, i = 0, il = indices.length; i < il; ++i) {
      p = this.manager.getParameter(this.fqName, indices[i]);
      Array.prototype.push.apply(vals, v = this.fqParse(p.value));
    }
    
    return vals;
  },
  
  /**
   * Removes all filter queries using the widget's facet field.
   *
   * @returns {Boolean} Whether a filter query was removed.
   */
  clearValues: function () {
    return this.manager.removeParameters(this.fqName, this.fqRegExp);
  },
  
  /**
   * One of "facet.field", "facet.date" or "facet.range" must be set on the
   * widget in order to determine where the facet counts are stored.
   *
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCounts: function (facet_counts) {
    var property;
    
    if (this.useJson === true) {
        if (facet_counts == null)
          facet_counts = this.manager.response.facets;
      return facet_counts.count > 0 ? facet_counts[this.id].buckets : [];
    }
    
    if (facet_counts == null)
      facet_counts = this.manager.response.facet_counts;
    
    if (this.facet.field !== undefined)
      property = 'facet_fields';
    else if (this.facet.date !== undefined)
      property = 'facet_dates';
    else if (this.facet.range !== undefined)
      property = 'facet_ranges';

    if (property !== undefined) {
      switch (this.manager.getParameter('json.nl').value) {
        case 'map':
          return this.getFacetCountsMap(facet_counts, property);
        case 'arrarr':
          return this.getFacetCountsArrarr(facet_counts);
        default:
          return this.getFacetCountsFlat(facet_counts);
      }
    }
    throw 'Cannot get facet counts unless one of the following properties is set to "true" on widget "' + this.id + '": "facet.field", "facet.date", or "facet.range".';
  },
  
  /**
   * Used if the facet counts are represented as a JSON object.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsMap: function (facet_counts, property) {
    var counts = [];
    for (var facet in facet_counts[property][this.id]) {
      counts.push({
        val: facet,
        count: parseInt(facet_counts[property][this.id][facet])
      });
    }
    return counts;
  },

  /**
   * Used if the facet counts are represented as an array of two-element arrays.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsArrarr: function (facet_counts, property) {
    var counts = [];
    for (var i = 0, l = facet_counts[property][this.id].length; i < l; i++) {
      counts.push({
        val: facet_counts[property][this.id][i][0],
        count: parseInt(facet_counts[property][this.id][i][1])
      });
    }
    return counts;
  },

  /**
   * Used if the facet counts are represented as a flat array.
   *
   * @param {String} property "facet_fields", "facet_dates", or "facet_ranges".
   * @returns {Array} An array of objects with the properties <tt>facet</tt> and
   * <tt>count</tt>, e.g <tt>{ facet: 'facet', count: 1 }</tt>.
   */
  getFacetCountsFlat: function (facet_counts, property) {
    var counts = [];
    for (var i = 0, l = facet_counts[property][this.id].length; i < l; i += 2) {
      counts.push({
        val: facet_counts[property][this.id][i],
        count: parseInt(facet_counts[property][this.id][i + 1])
      });
    }
    return counts;
  },
  
   /**
   * @param {String|Object} value The facet value.
   * @param {Boolean} exclude Whether to exclude this fq parameter value.
   * @returns {String} An fq parameter value.
   */
  fqValue: function (value, exclude) {
    return (exclude ? '-' : '') + Solr.escapeField(this.field) + ':' + Solr.facetValue(value);
  },

   /**
   * @param {String} value The stringified facet value
   * @returns {Object|String} The value that produced this output
   */
  fqParse: function (value) {
    var m = value.match(this.fqRegExp);
    return m != null ? Solr.parseFacet(m[1]) : null;
  }

};
