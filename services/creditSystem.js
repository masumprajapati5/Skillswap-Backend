const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Credit System
 * Handles credit calculation, transfer, and transaction recording
 */

// Credit rate: 1 credit per minute of session
const CREDIT_RATE = 1;
const WELCOME_BONUS = 25;

/**
 * Award credits to both users after a completed session
 */
const processSessionCredits = async (session) => {
  const credits = (session.duration || 60) * CREDIT_RATE;

  // Provider (teacher) earns credits
  const provider = await User.findById(session.provider);
  provider.credits += credits;
  await provider.save();

  await Transaction.create({
    user: provider._id,
    type: 'earn',
    amount: credits,
    balance: provider.credits,
    reference: session._id,
    referenceModel: 'Session',
    description: `Earned for teaching session`
  });

  // Requester (learner) spends credits (if not a direct swap)
  // In a direct swap, both earn — no one spends
  // For credit-based sessions, deduct from requester
  
  return { credits, provider: provider._id };
};

/**
 * Award welcome bonus to new user
 */
const awardWelcomeBonus = async (userId) => {
  const user = await User.findById(userId);
  user.credits += WELCOME_BONUS;
  await user.save();

  await Transaction.create({
    user: userId,
    type: 'bonus',
    amount: WELCOME_BONUS,
    balance: user.credits,
    description: 'Welcome bonus — new account'
  });

  return WELCOME_BONUS;
};

/**
 * Award referral bonus
 */
const awardReferralBonus = async (referrerId, referredId) => {
  const REFERRAL_BONUS = 50;
  const referrer = await User.findById(referrerId);
  referrer.credits += REFERRAL_BONUS;
  await referrer.save();

  await Transaction.create({
    user: referrerId,
    type: 'bonus',
    amount: REFERRAL_BONUS,
    balance: referrer.credits,
    reference: referredId,
    referenceModel: 'User',
    description: 'Referral bonus'
  });

  return REFERRAL_BONUS;
};

module.exports = { processSessionCredits, awardWelcomeBonus, awardReferralBonus, CREDIT_RATE };
