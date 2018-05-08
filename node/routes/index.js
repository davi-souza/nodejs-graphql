var express = require('express');
var router = express.Router();
var { graphql } = require('graphql');
var { TypeComposer, schemaComposer } = require('graphql-compose');
var { _, find, filter } = require('lodash');
var elasticsearch = require('elasticsearch');

/* Elasticsearch Client */
var client = new elasticsearch.Client({
  host: 'es:9200',
  log: 'trace'
});


/* Path to see a GraphQL query result */
router.get('/', async function(req, res, next) {
  // Getting all hits from index 'authors'
  let aResult = await client.search({
    index: 'authors',
    q: '*:*'
  });
  // Getting all hits from index 'posts'
  let pResult = await client.search({
    index: 'posts',
    q: '*:*'
  });

  var authors = [];
  var posts = [];

  for(let a of aResult.hits.hits){
    authors.push(a._source)
  }

  for(let p of pResult.hits.hits){
    posts.push(p._source)
  }

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

  /* Building schema */
  const schema = schemaComposer.buildSchema();

  /* Query */
  const query = `{
    posts {
      id
      title
      author {
        firstName
        lastName
      }
    }
  }`;

  /* Using GraphQL */
  graphql(schema,query).then(result => {
    res.send(result);
    res.end();
  });
  
});

/* Path to populate the Elasticsearch */
router.get('/es/data/create',function(req,res,next){
  const authors = [
    { id: 1, firstName: 'Tom', lastName: 'Coleman' },
    { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
    { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
  ];

  const posts = [
    { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
    { id: 2, authorId: 2, title: 'Welcome to Apollo', votes: 3 },
    { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
    { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
  ];

  for(let a of authors){
    client.create({
      index: 'authors',
      type: 'type',
      id: a.id,
      body: a
    }, function(err,res){
      console.log(res);
    });
  }
  for(let p of posts){
    client.create({
      index: 'posts',
      type: 'type',
      id: p.id,
      body: p
    }, function(err,res){
      console.log(res);
    });
  }
  res.end('ElasticSearch Loaded');
});


module.exports = router;
