"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  UserIcon,
  BookOpenIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";

interface ForumPost {
  id: number;
  title: string;
  content: string;
  author: string;
  authorId: number;
  courseTitle?: string;
  courseId?: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  likes: number;
  commentCount: number;
  isLiked: boolean;
  lastActivity: string;
}

interface Comment {
  id: number;
  content: string;
  author: string;
  authorId: number;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

const ForumPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
  });
  const [newComment, setNewComment] = useState("");

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "general", label: "General Discussion" },
    { value: "technical", label: "Technical Help" },
    { value: "assignments", label: "Assignments" },
    { value: "projects", label: "Projects" },
    { value: "announcements", label: "Announcements" },
  ];

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setLoading(true);
      const postsData = await apiService.getForumPosts();
      setPosts(postsData);
    } catch (error) {
      console.error("Error loading forum data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const commentsData = await apiService.getForumComments(postId);
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const postData = {
        ...newPost,
        tags: newPost.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };
      await apiService.createForumPost(postData);
      setShowCreateModal(false);
      setNewPost({ title: "", content: "", category: "general", tags: "" });
      loadForumData();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim()) return;

    try {
      await apiService.createForumComment(selectedPost.id, {
        content: newComment,
      });
      setNewComment("");
      loadComments(selectedPost.id);
    } catch (error) {
      console.error("Error creating comment:", error);
    }
  };

  const handlePostSelect = (post: ForumPost) => {
    setSelectedPost(post);
    loadComments(post.id);
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Forum - EduPlatform"
        description="Connect with fellow students and instructors"
        keywords="forum, discussion, community, learning"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.value
                        ? "bg-blue-100 text-blue-800"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Community Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Posts</span>
                  <span className="font-semibold">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Today</span>
                  <span className="font-semibold">
                    {
                      posts.filter(
                        (p) =>
                          new Date(p.lastActivity).toDateString() ===
                          new Date().toDateString()
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Categories</span>
                  <span className="font-semibold">{categories.length - 1}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedPost ? (
              <>
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Community Forum
                      </h1>
                      <p className="text-gray-600">
                        Connect with your peers, ask questions, and share
                        knowledge
                      </p>
                    </div>
                    {isAuthenticated && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        New Post
                      </button>
                    )}
                  </div>
                </div>

                {/* Posts List */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-lg text-gray-600">
                        Loading discussions...
                      </div>
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                      <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No discussions found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm || selectedCategory !== "all"
                          ? "Try adjusting your search or filter criteria."
                          : "Be the first to start a discussion!"}
                      </p>
                      {isAuthenticated && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Start a Discussion
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handlePostSelect(post)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {post.isPinned && (
                                <StarIcon className="h-4 w-4 text-yellow-500" />
                              )}
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  post.category === "announcements"
                                    ? "bg-red-100 text-red-800"
                                    : post.category === "technical"
                                    ? "bg-blue-100 text-blue-800"
                                    : post.category === "assignments"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {categories.find(
                                  (c) => c.value === post.category
                                )?.label || post.category}
                              </span>
                              {post.courseTitle && (
                                <span className="text-xs text-gray-500 flex items-center">
                                  <BookOpenIcon className="h-3 w-3 mr-1" />
                                  {post.courseTitle}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {post.content}
                            </p>

                            {post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {post.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-1" />
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              <span>{formatTimeAgo(post.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-red-500">
                              <HeartIcon className="h-4 w-4 mr-1" />
                              <span>{post.likes}</span>
                            </div>
                            <div className="flex items-center text-blue-500">
                              <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                              <span>{post.commentCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Post Detail View */
              <div>
                {/* Back Button */}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
                >
                  ← Back to discussions
                </button>

                {/* Post Content */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {selectedPost.isPinned && (
                        <StarIcon className="h-5 w-5 text-yellow-500" />
                      )}
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          selectedPost.category === "announcements"
                            ? "bg-red-100 text-red-800"
                            : selectedPost.category === "technical"
                            ? "bg-blue-100 text-blue-800"
                            : selectedPost.category === "assignments"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {categories.find(
                          (c) => c.value === selectedPost.category
                        )?.label || selectedPost.category}
                      </span>
                      {selectedPost.courseTitle && (
                        <span className="text-sm text-gray-500 flex items-center">
                          <BookOpenIcon className="h-4 w-4 mr-1" />
                          {selectedPost.courseTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {selectedPost.title}
                  </h1>

                  <div className="prose max-w-none text-gray-700 mb-6">
                    {selectedPost.content
                      .split("\n")
                      .map((paragraph, index) => (
                        <p key={index} className="mb-3">
                          {paragraph}
                        </p>
                      ))}
                  </div>

                  {selectedPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedPost.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1" />
                        <span>{selectedPost.author}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>{formatTimeAgo(selectedPost.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <button className="flex items-center text-red-500 hover:text-red-700">
                        {selectedPost.isLiked ? (
                          <HeartSolidIcon className="h-5 w-5 mr-1" />
                        ) : (
                          <HeartIcon className="h-5 w-5 mr-1" />
                        )}
                        <span>{selectedPost.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Comments ({comments.length})
                  </h3>

                  {/* Comment Form */}
                  {isAuthenticated && (
                    <form onSubmit={handleCreateComment} className="mb-8">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post Comment
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Comments List */}
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border-l-4 border-blue-200 pl-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">
                              {comment.author}
                            </span>
                            <span>•</span>
                            <span>{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                          <button className="flex items-center text-red-500 hover:text-red-700 text-sm">
                            {comment.isLiked ? (
                              <HeartSolidIcon className="h-4 w-4 mr-1" />
                            ) : (
                              <HeartIcon className="h-4 w-4 mr-1" />
                            )}
                            <span>{comment.likes}</span>
                          </button>
                        </div>
                        <div className="text-gray-700">
                          {comment.content
                            .split("\n")
                            .map((paragraph, index) => (
                              <p key={index} className="mb-2">
                                {paragraph}
                              </p>
                            ))}
                        </div>
                      </div>
                    ))}

                    {comments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No comments yet. Be the first to comment!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Create New Post
            </h3>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What's your question or topic?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) =>
                    setNewPost({ ...newPost, category: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.slice(1).map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  required
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your question or share your thoughts..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newPost.tags}
                  onChange={(e) =>
                    setNewPost({ ...newPost, tags: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="javascript, react, assignment"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumPage;
