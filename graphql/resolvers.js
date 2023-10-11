import User from '../models/user.js';
import Post from '../models/post.js';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import { clearImage } from '../util/file.js';

export async function createUser(args, req) {
  const { email, password, name } = args.userInput;
  const errors = [];
  if (!validator.isEmail(email)) {
    errors.push({ message: 'Email is invalid' });
  }
  if (
    validator.isEmpty(password) ||
    !validator.isLength(password, { min: 6 })
  ) {
    errors.push({ message: "'Password too short!'" });
  }
  if (errors.length > 0) {
    const error = new Error('Invalid input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('User exists already!');
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = new User({
    email,
    name,
    password: hashedPassword,
  });

  const createdUser = await user.save();
  return {
    ...createdUser._doc,
    _id: createdUser._id.toString(),
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('User not found');
    error.code = 401;
    throw error;
  }
  const isEqual = await bcrypt.compare(password, user.password);
  if (!isEqual) {
    const error = new Error('Email or password is incorrect!');
    error.code = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    'bbk@bbk.com',
    { expiresIn: '1h' }
  );

  return { token, userId: user._id.toString() };
}

export async function createPost(args, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  const { title, content, imageUrl } = args.postInput;
  const errors = [];
  if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
    errors.push({ message: 'Title is invalid' });
  }
  if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
    errors.push({ message: 'Title is invalid' });
  }
  if (errors.length > 0) {
    const error = new Error('Invalid input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('Invalid user.');
    error.code = 401;
    throw error;
  }

  const post = await Post({
    title,
    content,
    imageUrl,
    creator: user,
  });

  const createdPost = await post.save();

  user.posts.push(createdPost);
  await user.save();
  return {
    ...createdPost._doc,
    _id: createdPost._id.toString(),
    createdAt: createdPost.createdAt.toISOString(),
    updatedAt: createdPost.updatedAt.toISOString(),
  };
}

export async function posts({ page }, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }

  if (!page) {
    apge = 1;
  }

  const perPage = 2;

  const totalPosts = await Post.find().countDocuments();
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate('creator')
    .skip((page - 1) * perPage)
    .limit(perPage);

  return {
    posts: posts.map((post) => {
      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    }),
    totalPosts,
  };
}

export async function post({ id }, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  const post = await Post.findById(id).populate('creator');
  if (!post) {
    const error = new Error('No post found!');
    error.code = 404;
    throw error;
  }

  return {
    ...post._doc,
    _id: post._id.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function updatePost({ id, postInput }, req) {
  const { title, content, imageUrl } = postInput;
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }

  const post = await Post.findById(id).populate('creator');
  if (!post) {
    const error = new Error('No post found!');
    error.code = 404;
    throw error;
  }

  if (post.creator._id.toString() !== req.userId.toString()) {
    const error = new Error('Not authorized!');
    error.code = 403;
    throw error;
  }

  const errors = [];
  if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
    errors.push({ message: 'Title is invalid' });
  }
  if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
    errors.push({ message: 'Title is invalid' });
  }
  if (errors.length > 0) {
    const error = new Error('Invalid input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }

  post.title = title;
  post.content = content;
  if (imageUrl !== 'undefined') {
    post.imageUrl = imageUrl;
  }

  const updatedPost = await post.save();
  return {
    ...updatedPost._doc,
    _id: post._id.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function deletePost({ id }, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  const post = await Post.findById(id);
  if (!post) {
    const error = new Error('No post found!');
    error.code = 404;
    throw error;
  }

  if (post.creator.toString() !== req.userId.toString()) {
    const error = new Error('Not authorized!');
    error.code = 403;
    throw error;
  }

  clearImage(post.imageUrl);

  await Post.findByIdAndRemove(id);
  const user = await User.findById(req.userId);
  user.posts.pull(id);
  await user.save();
  return true;
}

export async function user(args, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('No User Found!');
    error.code = 404;
    throw error;
  }

  return {
    ...user._doc,
    _id: user._id.toString(),
  };
}

export async function updateStatus({ status }, req) {
  if (!req.isAuth) {
    const error = new Error('Not authenticated!');
    error.code = 401;
    throw error;
  }
  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('No User Found!');
    error.code = 404;
    throw error;
  }

  user.status = status;
  await user.save();
  return {
    ...user._doc,
    _id: user._id.toString(),
  };
}
