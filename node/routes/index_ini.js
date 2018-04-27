var express = require('express');
var router = express.Router();
var { graphql, GraphQLSchema, GraphQLObjectType } = require('graphql');
var { TypeComposer } = require('graphql-compose');
var { composeWithElastic, elasticApiFieldConfig } = require('graphql-compose-elasticsearch');
var elasticsearch = require('elasticsearch');

/* GET home page. */
router.get('/', function(req, res, next) {
  // var elasticSearchClient = new elasticsearch.Client({
  //   host: 'http://es:9200',
  //   log: 'trace'
  // });

  const mapping = {
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      gender: {
        type: 'text',
      },
      birthday: {
        type: 'date',
      },
      position: {
        type: 'text',
      },
      relocation: {
        type: 'boolean',
      },
      salary: {
        properties: {
          currency: {
            type: 'text',
          },
          total: {
            type: 'double',
          },
        },
      },
      skills: {
        type: 'text',
      },
      languages: {
        type: 'keyword',
      },
      location: {
        properties: {
          name: {
            type: 'text',
          },
          point: {
            type: 'geo_point',
          },
        },
      },
      experience: {
        properties: {
          company: {
            type: 'text',
          },
          description: {
            type: 'text',
          },
          end: {
            type: 'date',
          },
          position: {
            type: 'text',
          },
          start: {
            type: 'date',
          },
          tillNow: {
            type: 'boolean',
          },
        },
      },
      createdAt: {
        type: 'date',
      },
    },
  };

  const UserEsTC = composeWithElastic({
    graphqlTypeName: 'UserES',
    elasticIndex: 'db',
    elasticType: 'test',
    elasticMapping: mapping,
    elasticClient: new elasticsearch.Client({
      host: 'http://es:9200',
      log: 'trace',
    }),
    // elastic mapping does not contain information about is fields are arrays or not
    // so provide this information explicitly for obtaining correct types in GraphQL
    pluralFields: ['skills', 'languages'],
  });

  const ProxyTC = TypeComposer.create(`type ProxyDebugType { source: JSON }`);
  ProxyTC.addResolver({
    name: 'showArgs',
    kind: 'query',
    args: {
      source: 'JSON',
    },
    type: 'ProxyDebugType',
    resolve: ({ args }) => args,
  });

  UserEsTC.addRelation('showRelationArguments', {
    resolver: () => ProxyTC.getResolver('showArgs'),
    prepareArgs: {
      source: source => source,
    },
    projection: {
      name: true,
      salary: true,
    },
  });

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        userSearch: UserEsTC.getResolver('search').getFieldConfig(),
        userSearchConnection: UserEsTC.getResolver('searchConnection').getFieldConfig(),
        elastic50: elasticApiFieldConfig({
          host: 'http://es:9200',
          log: 'trace',
        }),
      },
    }),
  });

  graphql(schema, '{ salary { total } }').then((response) => {
    console.log(response);
  }).catch(err => {
    console.log('--- error ---\n',err);
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
