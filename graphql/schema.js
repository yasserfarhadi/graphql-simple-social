// import {
//   GraphQLSchema,
//   GraphQLObjectType,
//   GraphQLString,
//   GraphQLInt,
// } from 'graphql';

// export default new GraphQLSchema({
//   query: new GraphQLObjectType({
//     name: 'Query',
//     fields: {
//       hello: {
//         type: new GraphQLObjectType({
//           name: 'hello',
//           fields: () => ({
//             text: { type: GraphQLString },
//             views: { type: GraphQLInt },
//           }),
//         }),
//         resolve: () => ({ text: 'Hello World', views: 123 }),
//       },
//     },
//   }),
// });

import { buildSchema } from 'graphql';

export default buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    status: String!
    posts: [Post!]!
  }

  input UserInputData {
    email: String!
    name: String!
    password: String!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  input PostInputData {
    title: String!
    content: String!
    imageUrl: String!
  }

  type PostData {
    posts: [Post!]!
    totalPosts: Int!
  }

  type RootQuery {
    login(email: String!, password: String!): AuthData
    posts(page: Int!): PostData
    post(id: ID!): Post!
    user: User!
  }

  type RootMutation {
    createUser(userInput: UserInputData): User!
    createPost(postInput: PostInputData!): Post!
    updatePost(id: ID!, postInput: PostInputData!): Post!
    deletePost(id: ID!): Boolean!
    updateStatus(status: String!): User!
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);
