(function (Solr, a$) {
  Solr.QueryingURL = function (obj) {
    a$.extend(true, this, obj);
  };
  
  Solr.QueryingURL.prototype = {
    __expects: [ Solr.Configuring ],

    prepareQuery: function () {
      // TODO: Prepare the URL string for the query
      return {
        url: ""
      };
    },
    
    parseQuery: function (response) {

    }
  };
  
})(Solr, a$);
