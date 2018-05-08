var express = require('express');
var router = express.Router();
var { graphql } = require('graphql');
var { TypeComposer, schemaComposer } = require('graphql-compose');
var { _, find, filter } = require('lodash');
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'http://es:9200',
  log: 'trace'
});

/* GET home page. */
router.get('/', async function(req, res, next) {

  var aut = await client.search({
    index: 'authors',
    q: '*:*'
  });

  var authors = [];
  for(let a of aut.hits.hits)
    authors.push(a._source);

  var pos = await client.search({
    index: 'posts',
    q: '*:*'
  });

  var posts = [];
  for(let p of pos.hits.hits)
    posts.push(p._source);

  const AuthorTC = TypeComposer.create({
    name: 'Author',
    fields: {
      id: 'Int!',
      firstName: 'String',
      lastName: 'String',
    },
  });

  const PostTC = TypeComposer.create({
    name: 'Post',
    fields: {
      id: 'Int!',
      title: 'String',
      votes: 'Int',
      authorId: 'Int',
    },
  });


  PostTC.addFields({
    author: {
      // you may provide type name as string 'Author',
      // but for better developer experience use Type instance `AuthorTC`
      // it allows to jump to type declaration via Ctrl+Click in your IDE
      type: AuthorTC,
      // resolve method as first argument will receive data for some Post
      // from this data you should somehow fetch Author's data
      // let's take lodash `find` method, for searching by `authorId`
      // PS. `resolve` method may be async for fetching data from DB
      // resolve: async (source, args, context, info) => { return DB.find(); }
      resolve: post => find(authors, { id: post.authorId }),
    },
  });

  AuthorTC.addFields({
    posts: {
      // Array of posts may be described as string in SDL in such way '[Post]'
      // But graphql-compose allow to use Type instance wrapped in array
      type: [PostTC],
      // for obtaining list of post we get current author.id
      // and scan and filter all Posts with desired authorId
      resolve: author => filter(posts, { authorId: author.id }),
    },
    postCount: {
      type: 'Int',
      description: 'Number of Posts written by Author',
      resolve: author => filter(posts, { authorId: author.id }).length,
    },
  });



  // Requests which read data put into Query
  schemaComposer.Query.addFields({
    posts: {
      type: '[Post]',
      resolve: () => posts,
    },
    author: {
      type: 'Author',
      args: { id: 'Int!' },
      resolve: (_, { id }) => find(authors, { id }),
    },
  });

  // Requests which modify data put into Mutation
  schemaComposer.Mutation.addFields({
    upvotePost: {
      type: 'Post',
      args: {
        postId: 'Int!',
      },
      resolve: (_, { postId }) => {
        const post = find(posts, { id: postId });
        if (!post) {
          throw new Error(`Couldn't find post with id ${postId}`);
        }
        post.votes += 1;
        return post;
      },
    },
  });

  // After Root type definition, you are ready to build Schema
  // which should be passed to `express-graphql` or `apollo-server`
  const schema = schemaComposer.buildSchema();
  var query = `{
    author (id: 2) {
      firstName
      posts {
        title
        votes
      }
    }
  }`;
  graphql(schema, query).then(result => {
    console.log(result);
    res.send(result);
    res.end();
  });

console.log(posts);
});

router.get('/es/data/create', function(req,res,next){

  const authors = [
    { id: 1, firstName: 'Tom', lastName: 'Coleman' },
    { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
    { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
  ];
  for(let a of authors){
    client.create({
      index: 'authors',
      type: 'type',
      id: a.id,
      body: a
    }, function(error,response){
    });
  }

  const posts = [
    { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
    { id: 2, authorId: 2, title: 'Welcome to Apollo', votes: 3 },
    { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
    { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
  ];

  for(let p of posts){
    client.create({
      index: 'posts',
      type: 'type',
      id: p.id,
      body: p
    }, function(error,response){
    });
  }
  res.send('ElasticSearch loaded');
});

module.exports = router;
