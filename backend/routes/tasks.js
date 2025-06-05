const express = require('express');
const Task = require('../models/Task');
const Application = require('../models/Application');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { createNotification } = require('./notifications');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper function to convert duration string to minutes
const parseDurationToMinutes = (durationStr) => {
  const duration = durationStr.toLowerCase();
  
  if (duration.includes('minute')) {
    return parseInt(duration) || 30;
  } else if (duration.includes('hour')) {
    const hours = parseInt(duration) || 1;
    return hours * 60;
  } else if (duration.includes('day')) {
    const days = parseInt(duration) || 1;
    return days * 24 * 60;
  } else if (duration.includes('week')) {
    const weeks = parseInt(duration) || 1;
    return weeks * 7 * 24 * 60;
  }
  
  // If just a number, assume minutes
  const num = parseInt(duration);
  return isNaN(num) ? 30 : num;
};

// Create task (Anyone can create now)
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.canCreateTasks) {
      return res.status(403).json({ message: 'You are not allowed to create tasks' });
    }

    const { title, description, skillsRequired, dateTime, duration, credits, urgency } = req.body;

    const durationInMinutes = parseDurationToMinutes(duration);

    const task = new Task({
      taskProviderId: req.user.id,
      title,
      description,
      skillsRequired: skillsRequired || [],
      dateTime,
      duration,
      durationInMinutes,
      credits,
      urgency: urgency || 'medium'
    });

    await task.save();
    await task.populate('taskProviderId', 'username rating');

    // Update user's tasks created count
    await User.findByIdAndUpdate(req.user.id, { $inc: { tasksCreated: 1 } });

    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks (with smart filtering)
router.get('/', auth, async (req, res) => {
  try {
    const {
      search,
      skillRequired,
      urgency,
      minDuration,
      maxDuration,
      minCredits,
      maxCredits,
      sortBy = 'dateTime',
      sortOrder = 'asc',
      showAll = 'false'
    } = req.query;

    // Build query object
    let query = {
      status: 'open',
      dateTime: { $gte: new Date() },
      taskProviderId: { $ne: req.user.id } // Exclude user's own tasks
    };

    // If user has skills and not showing all, filter by skills
    if (showAll !== 'true' && req.user.skills.length > 0) {
      query.skillsRequired = { $in: req.user.skills };
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by specific skill
    if (skillRequired) {
      query.skillsRequired = { $in: [skillRequired] };
    }

    // Filter by urgency
    if (urgency) {
      query.urgency = urgency;
    }

    // Filter by duration (in minutes)
    if (minDuration || maxDuration) {
      query.durationInMinutes = {};
      if (minDuration) query.durationInMinutes.$gte = parseInt(minDuration);
      if (maxDuration) query.durationInMinutes.$lte = parseInt(maxDuration);
    }

    // Filter by credits range
    if (minCredits || maxCredits) {
      query.credits = {};
      if (minCredits) query.credits.$gte = parseInt(minCredits);
      if (maxCredits) query.credits.$lte = parseInt(maxCredits);
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('taskProviderId', 'username rating isOnline')
      .populate('applicants')
      .sort(sortOptions);

    // Add application status for current user
    const tasksWithApplicationStatus = await Promise.all(
      tasks.map(async (task) => {
        const userApplication = await Application.findOne({
          taskId: task._id,
          applicantId: req.user.id
        });
        
        return {
          ...task.toObject(),
          userApplicationStatus: userApplication ? userApplication.status : null,
          applicantCount: task.applicants.length
        };
      })
    );

    res.json(tasksWithApplicationStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all unique skills for filter dropdown
router.get('/skills', async (req, res) => {
  try {
    const skills = await Task.distinct('skillsRequired', {
      status: 'open',
      dateTime: { $gte: new Date() }
    });
    
    res.json(skills.filter(skill => skill && skill.trim() !== ''));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ taskProviderId: req.user.id })
      .populate('taskProviderId', 'username rating')
      .populate('selectedHelper', 'username rating')
      .populate({
        path: 'applicants',
        populate: {
          path: 'applicantId',
          select: 'username rating skills completedTasks totalRatings bio createdAt'
        }
      })
      .sort({ dateTime: 1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single task with applications
router.get('/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('taskProviderId', 'username rating')
      .populate('selectedHelper', 'username rating')
      .populate({
        path: 'applicants',
        populate: {
          path: 'applicantId',
          select: 'username rating skills completedTasks totalRatings bio createdAt'
        }
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark task as completed by provider
router.put('/:taskId/complete', auth, async (req, res) => {
  try {
    const { completionNote } = req.body;
    const task = await Task.findById(req.params.taskId)
      .populate('selectedHelper', 'username');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.taskProviderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (task.status !== 'in-progress') {
      return res.status(400).json({ message: 'Task must be in progress to complete' });
    }

    // Update task
    task.status = 'completed';
    task.completedByProvider = true;
    task.completionNote = completionNote || '';
    await task.save();

    // Update booking
    const booking = await Booking.findOne({ taskId: task._id })
      .populate('helper', 'username');
    
    if (booking) {
      booking.status = 'completed';
      booking.completedAt = new Date();
      booking.providerAcceptanceNote = completionNote || '';
      await booking.save();

      // Transfer credits
      await User.findByIdAndUpdate(booking.taskProvider, { 
        $inc: { credits: -booking.agreedCredits } 
      });
      await User.findByIdAndUpdate(booking.helper, { 
        $inc: { credits: booking.agreedCredits, completedTasks: 1 } 
      });

      // Create notification for helper about task completion
      await createNotification({
        userId: booking.helper._id,
        type: 'task_completed',
        title: 'Task Completed Successfully!',
        message: `Your task "${task.title}" has been marked as completed by the task provider. You earned ${booking.agreedCredits} credits!`,
        relatedId: booking._id,
        relatedType: 'Booking',
        actionRequired: true,
        metadata: {
          taskTitle: task.title,
          creditsEarned: booking.agreedCredits,
          providerName: req.user.username,
          completionNote: completionNote || ''
        }
      });

      // Emit real-time notification via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${booking.helper._id}`).emit('receive_notification', {
          type: 'task_completed',
          title: 'Task Completed Successfully!',
          message: `Your task "${task.title}" has been completed!`,
          actionRequired: true
        });
      }
    }

    res.json({ message: 'Task marked as completed successfully', task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.taskProviderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update task that is not open' });
    }

    // Update duration in minutes if duration is changed
    if (req.body.duration) {
      req.body.durationInMinutes = parseDurationToMinutes(req.body.duration);
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      req.body,
      { new: true }
    ).populate('taskProviderId', 'username rating');

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.taskProviderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Cannot delete task that is not open' });
    }

    await Task.findByIdAndDelete(req.params.taskId);
    
    // Delete related applications
    await Application.deleteMany({ taskId: req.params.taskId });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;