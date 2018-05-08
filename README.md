# NODEJS with ELASTICSEARCH and GRAPHQL
__Build images:__
```
docker-compose build --no-cache
```
__Install node packages:__
```
docker-compose run node npm i
```
__Run containers:__
```
docker-compose up
```
__Step One:__
[Populate elasticsearch container](http://localhost:3000/es/data/create)

__Data Structure:__
```
authors = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
  { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];
```
```
posts = [
  { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
  { id: 2, authorId: 2, title: 'Welcome to Apollo', votes: 3 },
  { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
  { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
]
```
__Query used:__
```
`{
  posts {
    id
    title
    author {
      firstName
      lastName
    }
  }
}`
```

__Step Two:__
[Query Result](http://localhost:3000)
