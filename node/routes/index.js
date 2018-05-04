var express = require('express');
var router = express.Router();
var http = require('http');
var elasticsearch = require('elasticsearch');
var { graphql, buildSchema } = require('graphql');

/* GET home page. */
router.get('/', function(req, res, next) {

  var schema = buildSchema(`
      type Query {
        id: Int
        name: String
        gender: String
      }
    `)
  http.get('http://es:9200/db/_search?pretty=true&q=\*:\*',function(res){
    console.log(res);
  });
  // graphql(schema, '{ id }', 'http://es:9200')
  res.send('end');
});

/* GET to create data in ElasticSearch container */
router.get('/es/data/create', function(req,res,next){
  /* Loading JSON */
  let data1 = require('../data/data1.json');
  let data2 = require('../data/data2.json');
  let data3 = require('../data/data3.json');
  let data4 = require('../data/data4.json');
  let data = [data1, data2, data3, data4];

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
