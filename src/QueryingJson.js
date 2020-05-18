/** SolrJsX library - a neXt Solr queries JavaScript library.
  * Json querying skills - putting all appropriate parameters
  * for JSON based query.
  *
  * Author: Ivan Georgiev
  * Copyright © 2016, IDEAConsult Ltd.
  */
  

var paramIsUrlOnly = function(name) {
  return name.match(/^(json\.nl|json\.wrf|json2.+|q|wt|start)$/);
};

var paramJsonName = function (name) {
  var m = name.match(/^json(\.|$)(.*)/);
  return m && m[2];
};

Solr.QueryingJson = function (settings) {
  this.useBody = settings && settings.useBody === "false" ? false : true;
};

Solr.QueryingJson.prototype = {
  __expects: [ "enumerateParameters" ],
  useBody: true,
  
  prepareQuery: function () {
    var url = [ ],
        json = { 'params': {} },
        paramValue = function (param) {
          if (paramIsUrlOnly(param.name)) {
            url.push(Solr.stringifyParameter(param));
            return;
          }
          
          // Now, make the rest of the test.
          var val = null;
          
          if (typeof param.value === 'string')
            val = Solr.stringifyDomain(param) + param.value;
          else if (param.domain !== undefined)
            val = a$.extend({}, param.value, { 'domain': param.domain });
          else
            val = param.value;
            
          return val;
        };
 
    // make shallow enumerator so that arrays are saved as such.
    this.enumerateParameters(false, function (param) {
      // Take care for some very special parameters...
      var val = !Array.isArray(param) ? paramValue(param) : param.map(paramValue),
          name = !Array.isArray(param) ? param.name : param[0].name,
          jname = paramJsonName(name);

      if (val == undefined)
        return;
      else if (jname === '')
        a$.extend(json, val);
      else if (jname !== null)
        a$.path(json, jname, val);
      else
        json.params[name] = val;
    });

    json = JSON.stringify(json);
    if (!this.useBody) {
      url.push(encodeURIComponent(json));
      return { url: '?' + url.join("&") };
    }
    else
      return { url: '?' + url.join("&"), data: json, contentType: "application/json", type: "POST", method:"POST" };
  },
  
  parseQuery: function (response) {
    if (response.responseHeader.params && response.responseHeader.params.json != null) {
      var json = JSON.parse(response.responseHeader.params.json);
      a$.extend(response.responseHeader.params, json, json.params);
      delete response.responseHeader.params.json;
    }
    
    return response;
  }
  
};
