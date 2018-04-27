var express = require('express');
var router = express.Router();
var { GraphQLSchema, GraphQLObjectType } = require('graphql');
var { graphql } = require('graphql-compose');
var elasticsearch = require('elasticsearch');
var { elasticApiFieldConfig, composeWithElastic } = require('graphql-compose-elasticsearch');

/* GET home page. */
router.get('/', function(req, res, next) {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        elastic50: elasticApiFieldConfig(
          // you may provide existed Elastic Client instance
          new elasticsearch.Client({
            host: 'http://es:9200',
            apiVersion: '5.0',
          })
        ),
      },
    }),
  });

  console.log(schema);

  res.send('end');
});

/* GET to create data in ElasticSearch container */
router.get('/es/create/data', function(req,res,next){
  /* Loading JSON */
  let data1 = require('../data/data1.json');
  let data2 = require('../data/data2.json');
  let data3 = require('../data/data3.json');
  let data = [data1, data2, data3];

  /* Connecting to ElasticSearch */
  var client = new elasticsearch.Client({
    host: 'http://es:9200',
    log: 'trace'
  });

  /* Creating Data */
  for(let d of data){
    client.create({
      index: 'db',
      type: 'test',
      id: d.id,
      body: d
    }, function(error,response){
      console.log('error '+d.id+':',error);
      console.log('response '+d.id+':',response);
    });
  }

  res.send('ElasticSearch loaded');
});

module.exports = router;
