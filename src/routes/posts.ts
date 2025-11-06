import { Router } from 'express';
import databaseService from '../services/database';

const router = Router();

// Get all posts with pagination
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    
    const posts = await databaseService.getPosts(limit, offset);
    const total = await databaseService.getPostsCount();
    
    const postsWithParsedTags = posts.map(post => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));

    res.json({
      success: true,
      data: postsWithParsedTags,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
    });
  }
});

// Get specific post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await databaseService.getPostById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    const postWithParsedTags = {
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    };

    return res.json({
      success: true,
      data: postWithParsedTags,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
    });
  }
});

// Create new post
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      sourceUrl,
      imageUrl,
      category,
      tags,
      scheduledAt,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    const postData: any = {
      title,
      content,
      sourceType: 'manual',
      category: category || 'manual',
    };

    if (sourceUrl) postData.sourceUrl = sourceUrl;
    if (imageUrl) postData.imageUrl = imageUrl;
    if (tags) postData.tags = tags;
    if (scheduledAt) {
      postData.scheduledAt = new Date(scheduledAt);
      postData.status = 'scheduled';
    }

    const post = await databaseService.createPost(postData);

    return res.json({
      success: true,
      data: post,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create post',
    });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const client = databaseService.getClient();
    const updatedPost = await client.post.update({
      where: { id },
      data: updates,
    });

    res.json({
      success: true,
      data: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
    });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = databaseService.getClient();
    await client.post.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
    });
  }
});

// Get scheduled posts
router.get('/scheduled/upcoming', async (req, res) => {
  try {
    const scheduledPosts = await databaseService.getScheduledPosts();
    
    const postsWithParsedTags = scheduledPosts.map(post => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));

    res.json({
      success: true,
      data: postsWithParsedTags,
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled posts',
    });
  }
});

// Clear all posts and RSS items (for testing)
router.delete('/clear-all', async (req, res) => {
  try {
    const client = databaseService.getClient();
    
    // Delete in the correct order due to foreign key constraints
    await client.publishLog.deleteMany({});
    await client.post.deleteMany({});
    await client.rssItem.deleteMany({});
    
    console.log('🗑️ All posts and RSS items cleared');
    
    res.json({
      success: true,
      message: 'All posts and RSS items have been cleared',
    });
  } catch (error) {
    console.error('Error clearing all posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear posts',
    });
  }
});

export default router;