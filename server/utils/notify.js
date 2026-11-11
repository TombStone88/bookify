const Notification = require("../models/Notification");

/**
 * Creates and dispatches notifications to one or more recipients.
 * Enforces deduplication and broadcasts in real-time via Socket.IO.
 *
 * @param {Object} options
 * @param {import("socket.io").Server} [options.io] - Socket.IO instance
 * @param {string|string[]} options.recipients - Recipient user ID(s)
 * @param {string} [options.sender] - Sender user ID
 * @param {"club_message"|"club_invitation"|"club_book"|"club_member_joined"} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message body
 * @param {string} options.referenceId - Reference resource ID
 * @param {"club"|"book"|"message"} options.referenceType - Reference resource type
 * @returns {Promise<Array>} Created notification documents
 */
async function sendNotification({
  io,
  recipients,
  sender = null,
  type,
  title,
  message,
  referenceId,
  referenceType,
}) {
  const recipientList = Array.isArray(recipients) ? recipients : [recipients];
  const uniqueRecipients = [
    ...new Set(
      recipientList
        .filter(Boolean)
        .map((r) => (typeof r === "object" && r._id ? r._id.toString() : r.toString()))
    ),
  ];

  const createdNotifications = [];

  for (const recipientId of uniqueRecipients) {
    // Prevent sending notifications to self
    if (sender && recipientId === sender.toString()) continue;

    try {
      const notification = new Notification({
        recipient: recipientId,
        sender: sender || null,
        type,
        title,
        message,
        referenceId,
        referenceType,
      });

      const saved = await notification.save();
      const populated = await Notification.findById(saved._id)
        .populate("sender", "name username");

      createdNotifications.push(populated);

      // Emit real-time update to user-isolated socket room
      if (io) {
        io.to(`user:${recipientId}`).emit("newNotification", populated);
      }
    } catch (err) {
      console.error(`Failed to dispatch notification to ${recipientId}:`, err.message);
    }
  }

  return createdNotifications;
}

module.exports = { sendNotification };
