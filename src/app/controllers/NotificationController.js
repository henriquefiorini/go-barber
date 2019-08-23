import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
  async list(req, res) {
    // Validate current user as a provider
    const isProvider = await User.findOne({
      where: {
        id: req.currentUserId,
        provider: true,
      },
    });
    if (!isProvider) {
      return res.status(401).json({
        error: 'You are not allowed to view this resource.',
      });
    }

    // Get notifications
    const notifications = await Notification.find({
      user: req.currentUserId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20);
    return res.json(notifications);
  }

  async update(req, res) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true }
      );
      return res.json(notification);
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid identifier.',
      });
    }
  }
}

export default new NotificationController();
