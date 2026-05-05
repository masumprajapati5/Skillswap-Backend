const User = require('../models/User');

/**
 * Smart Match Engine
 * Uses Jaccard similarity on skill sets + rating boost
 * Returns sorted matches with compatibility score
 */
const findMatches = async (userId) => {
  const currentUser = await User.findById(userId)
    .populate('skillsOffered')
    .populate('skillsWanted');

  if (!currentUser) throw new Error('User not found');

  const offeredIds = currentUser.skillsOffered.map(s => s._id.toString());
  const wantedIds = currentUser.skillsWanted.map(s => s._id.toString());

  // Find potential matches: users who offer what we want OR want what we offer
  const candidates = await User.find({
    _id: { $ne: currentUser._id },
    $or: [
      { skillsOffered: { $in: wantedIds } },
      { skillsWanted: { $in: offeredIds } },
    ]
  })
  .select('-passwordHash')
  .populate('skillsOffered', 'name category')
  .populate('skillsWanted', 'name category');

  // Score each candidate
  const scored = candidates.map(candidate => {
    const candidateOfferedIds = candidate.skillsOffered.map(s => s._id.toString());
    const candidateWantedIds = candidate.skillsWanted.map(s => s._id.toString());

    // How many of our wanted skills does this candidate offer?
    const theyOfferWeWant = wantedIds.filter(id => candidateOfferedIds.includes(id)).length;
    
    // How many of our offered skills does this candidate want?
    const theyWantWeOffer = offeredIds.filter(id => candidateWantedIds.includes(id)).length;

    // Jaccard-style similarity
    const union = new Set([...wantedIds, ...candidateOfferedIds]).size;
    const intersection = theyOfferWeWant;
    const jaccardScore = union > 0 ? intersection / union : 0;

    // Mutual match bonus (both sides benefit)
    const mutualBonus = (theyOfferWeWant > 0 && theyWantWeOffer > 0) ? 0.3 : 0;

    // Rating boost (normalized 0-0.2)
    const ratingBoost = (candidate.rating || 0) / 25; // max 5 * 0.04 = 0.2

    const score = jaccardScore + mutualBonus + ratingBoost;

    return {
      user: candidate,
      score: Math.round(score * 100),
      theyOfferWeWant,
      theyWantWeOffer,
      isMutual: theyOfferWeWant > 0 && theyWantWeOffer > 0,
    };
  });

  // Sort by score descending
  return scored
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
};

module.exports = { findMatches };
