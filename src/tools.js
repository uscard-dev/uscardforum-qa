import { tool } from 'ai';
import { z } from 'zod';
import {
  searchForum,
  getHotTopics,
  getNewTopics,
  getTopTopics,
  getTopicPosts,
  getCategories,
  getUserSummary,
  getUserTopics,
  getUserReplies,
  getUserActions,
  getCurrentUser,
  getNotifications,
} from './forum-api.js';

export const forumTools = {
  search_forum: tool({
    description:
      'Search USCardForum for topics and posts matching a query. Supports Discourse operators: "in:title", "@username", "category:name", "#tag", "after:date", "before:date".',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      order: z
        .enum(['relevance', 'latest', 'views', 'likes', 'activity', 'posts'])
        .optional()
        .describe('Sort order for results'),
    }),
    execute: searchForum,
  }),

  get_hot_topics: tool({
    description:
      'Fetch currently trending/hot topics from USCardForum, ranked by engagement.',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number (0-indexed)'),
    }),
    execute: getHotTopics,
  }),

  get_new_topics: tool({
    description: 'Fetch the latest/newest topics, sorted by creation time (newest first).',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number (0-indexed)'),
    }),
    execute: getNewTopics,
  }),

  get_top_topics: tool({
    description: 'Fetch top-performing topics for a specific time period.',
    inputSchema: z.object({
      period: z
        .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .optional()
        .describe('Time window for ranking (default: monthly)'),
      page: z.number().optional().describe('Page number (0-indexed)'),
    }),
    execute: getTopTopics,
  }),

  get_topic_posts: tool({
    description:
      'Fetch a batch of ~20 posts from a topic starting at a specific position. Use for paginated reading.',
    inputSchema: z.object({
      topic_id: z.number().describe('The numeric topic ID'),
      post_number: z
        .number()
        .optional()
        .describe('Post number to start from (default: 1)'),
    }),
    execute: getTopicPosts,
  }),

  get_categories: tool({
    description:
      'Fetch all forum categories and subcategories with their IDs and names.',
    inputSchema: z.object({}),
    execute: getCategories,
  }),

  get_user_summary: tool({
    description:
      'Fetch a user profile summary including stats, top topics, and top replies. Returns HTTP 404 if the user has disabled public profile access — use get_user_topics or get_user_actions instead.',
    inputSchema: z.object({
      username: z.string().describe("The user's handle (case-insensitive)"),
    }),
    execute: getUserSummary,
  }),

  get_user_topics: tool({
    description: 'Fetch topics created by a specific user.',
    inputSchema: z.object({
      username: z.string().describe("The user's handle"),
      page: z.number().optional().describe('Page number for pagination'),
    }),
    execute: getUserTopics,
  }),

  get_user_replies: tool({
    description: 'Fetch replies/posts made by a user in other topics.',
    inputSchema: z.object({
      username: z.string().describe("The user's handle"),
      offset: z.number().optional().describe('Pagination offset (0, 30, 60, ...)'),
    }),
    execute: getUserReplies,
  }),

  get_user_actions: tool({
    description:
      'Fetch a user activity feed with optional filtering. Filter values: 1=likes given, 2=likes received, 4=topics created, 5=replies, 6=all posts, 7=mentions.',
    inputSchema: z.object({
      username: z.string().describe("The user's handle"),
      filter: z.number().optional().describe('Action type filter'),
      offset: z.number().optional().describe('Pagination offset (0, 30, 60, ...)'),
    }),
    execute: getUserActions,
  }),

  get_current_user: tool({
    description:
      'Get the currently logged-in user info including username, trust level, and unread notification counts.',
    inputSchema: z.object({}),
    execute: getCurrentUser,
  }),

  get_notifications: tool({
    description:
      'Fetch the current user\'s notifications (replies, mentions, likes, badges, etc.). Returns newest first.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Max notifications to return'),
    }),
    execute: getNotifications,
  }),
};
