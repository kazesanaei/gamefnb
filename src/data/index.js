// Gom toàn bộ dữ liệu game, tiêm vào lõi qua ctx.data.

import { BALANCE } from './balance.js'
import { INGREDIENTS } from './ingredients.js'
import { RECIPES, METHOD_LABELS, ROLE_LABELS } from './recipes.js'
import { MINIGAME_TYPES } from './minigame-types.js'
import { PERSONAS, REGULARS, NAMES } from './customers.js'
import { DIALOGUE, SPOKEN, SYNONYMS, LINE_KINDS, makeSpeech, makeLine, describeLine, readbackText } from './dialogue.js'
import { REVIEWS, makeReview } from './reviews.js'
import { TIPS, TIP_GROUPS, tipsForTrigger } from './tips.js'
import { UPGRADES } from './upgrades.js'
import { STRINGS } from './strings.js'

export const DATA = Object.freeze({
  BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS,
  // Bổ sung ngoài hợp đồng (chỉ thêm, không đổi):
  ROLE_LABELS, SPOKEN, SYNONYMS, LINE_KINDS, REVIEWS, TIP_GROUPS,
  describeLine, readbackText, tipsForTrigger
})

export {
  BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, ROLE_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, SPOKEN, SYNONYMS, LINE_KINDS, makeSpeech, makeLine,
  describeLine, readbackText, REVIEWS, makeReview, TIPS, TIP_GROUPS, tipsForTrigger, UPGRADES, STRINGS
}
