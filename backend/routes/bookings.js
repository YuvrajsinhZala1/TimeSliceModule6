const express = require('express');
const Booking = require('../models/Booking');
const Task = require('../models/Task');
const User = require('../models/User');
const Application = require('../models/Application');
const { createNotification } = require('./notifications');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user bookings
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Get bookings where user is either helper or task provider
    query.$or = [
      { helper: req.user.id },
      { taskProvider: req.user.id }
    ];

    const bookings = await Booking.find(query)
      .populate([
        { 
          path: 'taskId', 
          populate: { 
            path: 'taskProviderId', 
            select: 'username rating completedTasks' 
          } 
        },
        { path: 'helper', select: 'username rating completedTasks' },
        { path: 'taskProvider', select: 'username rating completedTasks' },
        { path: 'applicationId' },
        { path: 'chatId' }
      ])
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific booking details
router.get('/:bookingId', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate([
        { 
          path: 'taskId', 
          populate: { 
            path: 'taskProviderId', 
            select: 'username rating completedTasks bio skills' 
          } 
        },
        { path: 'helper', select: 'username rating completedTasks bio skills' },
        { path: 'taskProvider', select: 'username rating completedTasks bio skills' },
        { path: 'applicationId', populate: { path: 'applicantId', select: 'username' } },
        { path: 'chatId' }
      ]);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is part of this booking
    if (booking.helper._id.toString() !== req.user.id && 
        booking.taskProvider._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status with deliverables
router.put('/:bookingId/status', auth, async (req, res) => {
  try {
    const { status, workNote, deliverables } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    if (booking.helper.toString() !== req.user.id && 
        booking.taskProvider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const oldStatus = booking.status;
    booking.status = status;

    if (status === 'in-progress' && oldStatus === 'confirmed') {
      booking.startedAt = new Date();
      // Update task status
      await Task.findByIdAndUpdate(booking.taskId, { status: 'in-progress' });
    }

    // Helper submits work for review
    if (status === 'work-submitted') {
      booking.workSubmissionNote = workNote || '';
      
      // Add deliverables if provided
      if (deliverables) {
        booking.deliverables = {
          files: deliverables.files || [],
          githubLinks: deliverables.githubLinks || [],
          additionalLinks: deliverables.additionalLinks || []
        };
      }
      
      // Update task to show work is submitted
      await Task.findByIdAndUpdate(booking.taskId, { 
        completedByHelper: true 
      });

      // Create notification for task provider
      await createNotification({
        userId: booking.taskProvider,
        type: 'work_submitted',
        title: 'Work Submitted for Review',
        message: `Helper has submitted work for task: ${booking.taskId.title}`,
        relatedId: booking._id,
        relatedType: 'Booking',
        actionRequired: true,
        metadata: {
          taskTitle: booking.taskId.title,
          helperName: req.user.username,
          hasFiles: deliverables?.files?.length > 0,
          hasGithubLinks: deliverables?.githubLinks?.length > 0
        }
      });
    }

    if (status === 'cancelled') {
      // Update task back to open if cancelled early
      if (oldStatus === 'confirmed') {
        await Task.findByIdAndUpdate(booking.taskId, { 
          status: 'open',
          selectedHelper: null 
        });
      }
    }

    await booking.save();
    
    // Return populated booking
    const updatedBooking = await Booking.findById(booking._id)
      .populate([
        { path: 'taskId', populate: { path: 'taskProviderId', select: 'username rating' } },
        { path: 'helper', select: 'username rating' },
        { path: 'taskProvider', select: 'username rating' }
      ]);
    
    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit deliverables (separate endpoint for file uploads)
router.put('/:bookingId/deliverables', auth, async (req, res) => {
  try {
    const { files, githubLinks, additionalLinks } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only helper can submit deliverables
    if (booking.helper.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only helper can submit deliverables' });
    }

    if (booking.status !== 'in-progress' && booking.status !== 'work-submitted') {
      return res.status(400).json({ message: 'Can only submit deliverables for in-progress or work-submitted tasks' });
    }

    // Update deliverables
    booking.deliverables = {
      files: files || booking.deliverables?.files || [],
      githubLinks: githubLinks || booking.deliverables?.githubLinks || [],
      additionalLinks: additionalLinks || booking.deliverables?.additionalLinks || []
    };

    await booking.save();

    res.json({ 
      message: 'Deliverables submitted successfully',
      deliverables: booking.deliverables 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add review
router.post('/review/:bookingId', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const booking = await Booking.findById(req.params.bookingId)
      .populate('taskId')
      .populate('helper', 'username')
      .populate('taskProvider', 'username');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is part of this booking
    const isHelper = booking.helper._id.toString() === req.user.id;
    const isTaskProvider = booking.taskProvider._id.toString() === req.user.id;

    if (!isHelper && !isTaskProvider) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Update appropriate review
    if (isHelper) {
      if (booking.helperReview.rating) {
        return res.status(400).json({ message: 'You have already reviewed this booking' });
      }
      booking.helperReview = { rating, review };
      // Add to reviewedBy array
      booking.reviewedBy.push({
        userId: req.user.id,
        reviewType: 'helper'
      });
      // Update task provider's rating
      await updateUserRating(booking.taskProvider._id, rating);
    } else {
      if (booking.taskProviderReview.rating) {
        return res.status(400).json({ message: 'You have already reviewed this booking' });
      }
      booking.taskProviderReview = { rating, review };
      // Add to reviewedBy array
      booking.reviewedBy.push({
        userId: req.user.id,
        reviewType: 'taskProvider'
      });
      // Update helper's rating
      await updateUserRating(booking.helper._id, rating);
    }

    await booking.save();
    
    // Return populated booking
    const updatedBooking = await Booking.findById(booking._id)
      .populate([
        { path: 'taskId', populate: { path: 'taskProviderId', select: 'username rating' } },
        { path: 'helper', select: 'username rating' },
        { path: 'taskProvider', select: 'username rating' }
      ]);
    
    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update user rating
async function updateUserRating(userId, newRating) {
  const user = await User.findById(userId);
  const totalRatings = user.totalRatings + 1;
  const newAvgRating = ((user.rating * user.totalRatings) + newRating) / totalRatings;
  
  user.rating = newAvgRating;
  user.totalRatings = totalRatings;
  await user.save();
}

module.exports = router;