const cron = require('node-cron');
const Session = require('../models/Session');
const Notification = require('../models/Notification');

const initScheduler = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
      const sixMinutesFromNow = new Date(now.getTime() + 6 * 60000);

      // Find sessions starting in approximately 5 minutes
      const sessions = await Session.find({
        status: 'scheduled',
        reminderSent: false
      }).populate('requester provider');

      for (const session of sessions) {
        if (!session.scheduledDate || !session.scheduledTime) continue;

        // Parse scheduled time
        // Note: scheduledDate is YYYY-MM-DD, scheduledTime is HH:mm AM/PM
        const sessionTime = new Date(`${session.scheduledDate} ${session.scheduledTime}`);
        
        const diffMs = sessionTime - now;
        const diffMins = Math.floor(diffMs / 60000);

        // Notify if start time is between 4 and 6 minutes away
        if (diffMins >= 0 && diffMins <= 5) {
          const participants = [session.requester, session.provider];
          
          for (const participant of participants) {
            if (!participant) continue;

            const content = `Your session "${session.title}" starts in 5 minutes! Get ready.`;
            
            // Create Persistent Notification
            const notification = await Notification.create({
              user: participant._id,
              type: 'session_request', // Reusing session_request type or could use a new 'reminder' type
              content,
              reference: session._id,
              referenceModel: 'Session'
            });

            // Emit Live Notification
            io.to(`user_${participant._id}`).emit('notification_received', notification);
            
            // Also emit a specific 'session_reminder' event for UI feedback
            io.to(`user_${participant._id}`).emit('session_reminder', {
              sessionId: session._id,
              message: content
            });
          }

          // Mark as reminded
          session.reminderSent = true;
          await session.save();
          console.log(`[Scheduler] Sent 5min reminder for session: ${session._id}`);
        }
      }
    } catch (error) {
      console.error('[Scheduler Error]', error);
    }
  });

  console.log('[Scheduler] Notification service initialized');
};

module.exports = initScheduler;
