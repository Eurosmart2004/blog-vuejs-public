const { Blog, Comment, React } = require("../models/index");
const cloudinary = require("../configs/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");

const getAllBlogs = async () => {
  try {
    const blog = await Blog.find().exec();
    return blog;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const addBlog = async ({
  blogTitle,
  blogHTML,
  blogImage,
  datePost,
  author_id,
}) => {
  try {
    // Upload new image to Cloudinary
    const result = await cloudinary.uploader.upload(blogImage.path, {
      folder: `vue-blog/user/${author_id}/blog/${blogTitle.replace(/\s+/g, "_")}`, // Upload to a specific folder the same for folder in multer.js
    });

    await cloudinary.uploader.destroy(blogImage.filename); //Delete local file
    // await fs.promises.unlink(blogImage.path);

    const blog = {
      blogTitle,
      blogHTML,
      blogImage: result.secure_url, // Use the URL provided by Cloudinary
      datePost,
      author_id,
    };

    const newBlog = await Blog.create(blog);
    return { ...newBlog._doc };
  } catch (error) {
    throw error;
  }
};

const getBlogById = async ({ blogId }) => {
  try {
    const blog = await Blog.findOne({ _id: blogId }).exec();
    return blog;
  } catch (error) {
    throw error;
  }
};

const getBlogByUserId = async (author_id) => {
  if (!mongoose.Types.ObjectId.isValid(author_id)) {
    throw new Error("Invalid author_id");
  }
  try {
    const blog = await Blog.find({ author_id: author_id });
    return blog;
  } catch (error) {
    throw error;
  }
};

const updateBlog = async ({
  blogId,
  blogTitle,
  blogHTML,
  blogImage,
  user_id,
}) => {
  try {
    let blog = await findBlogById(blogId);
    if (!blog) {
      throw new Error("Blog not found");
    }
    if (blog.author_id.toString() !== user_id) {
      throw new Error("Not valid user to update blog");
    }
    blog.blogTitle = blogTitle;
    blog.blogHTML = blogHTML;

    if (blogImage) {
      // Delete old image from Cloudinary
      if (blog.blogImage) {
        const parts = blog.blogImage.split("/");
        const uploadIndex = parts.indexOf("upload");
        let publicId = parts.slice(uploadIndex + 2).join("/");
        publicId = publicId.split(".")[0];
        console.log("Public id of image of blog", publicId);
        await cloudinary.uploader.destroy(publicId);
      }
      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(blogImage.path, {
        folder: `user/${author_id}/blog/${blogTitle.replace(/\s+/g, "_")}`, // Upload to a specific folder the same for folder in multer.js
      });
      blog.blogImage = result.secure_url; // Use the URL provided by Cloudinary

      // await fs.promises.unlink(blogImage.path); //Delete local file
    }

    await blog.save();
  } catch (error) {
    throw error;
  }
};

const deleteBlog = async ({ blogId, user_id }) => {
  try {
    let blog = await findBlogById(blogId);
    if (!blog) {
      throw new Error("Blog not found");
    }
    if (blog.author_id.toString() !== user_id) {
      throw new Error("Not valid user to delete blog");
    }
    // Delete old image from Cloudinary
    if (blog.blogImage) {
      const parts = blog.blogImage.split("/");
      const uploadIndex = parts.indexOf("upload");
      let publicId = parts.slice(uploadIndex + 2).join("/");
      publicId = publicId.split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }
    // Delete comments and reactions associated with the blog
    await Comment.deleteMany({ blogId: blogId });
    await React.deleteMany({ blogId: blogId });

    await blog.deleteOne();
  } catch (error) {
    throw error;
  }
};

const findBlogById = async (id) => {
  let existingBlog = await Blog.findOne({ _id: id }).exec();
  return existingBlog;
};

module.exports = {
  getAllBlogs,
  addBlog,
  getBlogByUserId,
  getBlogById,
  updateBlog,
  deleteBlog,
};
